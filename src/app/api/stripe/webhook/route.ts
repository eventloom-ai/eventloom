import { NextResponse } from "next/server";
import { provisionPurchasedDomain, type ProvisionedDomain } from "@/lib/domains/provision";
import { env } from "@/lib/env";
import { AI_LAUNCH_BONUS_CENTS, LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";
import { loadLaunchOrderForProvisioning, verifyLaunchFulfillment } from "@/lib/payments/fulfillment";
import { logPaymentEvent } from "@/lib/payments/monitoring";
import { stripeClient } from "@/lib/payments/stripe";
import { deleteRegistrantPayload } from "@/lib/domains/registrant";
import { beginProviderEvent, markFulfillment, startFulfillmentJob } from "@/lib/payments/webhook-store";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const requestId = req.headers.get("x-vercel-id");
  const stripe = stripeClient();
  const secret = env.stripeWebhookSecret();
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!stripe || !secret || !signature) {
    logPaymentEvent("error", "webhook_not_configured", { requestId });
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    logPaymentEvent("warn", "webhook_signature_rejected", { requestId });
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  return processVerifiedStripeEvent(event, requestId);
}

export async function processVerifiedStripeEvent(event: Stripe.Event, requestId: string | null = null) {
  const startedAt = Date.now();
  const storedEvent = await beginProviderEvent(event.id, event.type);
  if (!storedEvent.ok) return NextResponse.json({ error: storedEvent.error }, { status: 503 });
  if (storedEvent.duplicate) return NextResponse.json({ ok: true, duplicate: true });

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId || !charge.amount || !charge.amount_refunded) return NextResponse.json({ error: "invalid_refund" }, { status: 400 });
    const { data, error } = await storedEvent.client.rpc("record_stripe_refund", {
      p_payment_intent_id: paymentIntentId,
      p_charge_id: charge.id,
      p_amount: charge.amount,
      p_amount_refunded: charge.amount_refunded,
    });
    if (error || !data) {
      await markFulfillment({ eventRowId: storedEvent.eventRowId, state: "retry", errorCode: error?.code ?? "refund_record_failed" });
      return NextResponse.json({ error: "refund_record_failed" }, { status: 500 });
    }
    await markFulfillment({ eventRowId: storedEvent.eventRowId, state: "service_active" });
    logPaymentEvent("info", "refund_recorded", { requestId, stripeEventId: event.id, fullRefund: Boolean((data as { full_refund?: boolean }).full_refund) });
    return NextResponse.json({ ok: true });
  }

  if (event.type !== "checkout.session.completed") {
    logPaymentEvent("info", "webhook_event_ignored", { requestId, stripeEventId: event.id, stripeEventType: event.type });
    await markFulfillment({ eventRowId: storedEvent.eventRowId, state: "service_active" });
    return NextResponse.json({ ok: true });
  }

  const session = event.data.object;
  const eventId = session.metadata?.event_id;
  const orderId = session.metadata?.order_id;
  const versionId = session.metadata?.version_id;
  if (
    !eventId ||
    !orderId ||
    !versionId ||
    session.metadata?.product !== "eventloom_launch" ||
    session.payment_status !== "paid" ||
    session.client_reference_id !== orderId ||
    session.amount_total == null ||
    session.amount_total < LAUNCH_PRICE_CENTS ||
    session.currency !== "usd"
  ) {
    logPaymentEvent("warn", "checkout_session_rejected", { requestId, stripeEventId: event.id, sessionId: session.id });
    return NextResponse.json({ error: "missing_metadata" }, { status: 400 });
  }

  const launchOrder = await loadLaunchOrderForProvisioning({
    eventId,
    orderId,
    versionId,
    stripeSessionId: session.id,
    amountTotal: session.amount_total,
    currency: session.currency,
    requestedDomain: session.metadata?.domain,
  });
  if (!launchOrder.ok) {
    // Never acknowledge a verified payment until the server-owned order has
    // been reloaded and validated. Stripe will retry non-2xx deliveries.
    logPaymentEvent("error", "launch_order_validation_failed", {
      requestId,
      stripeEventId: event.id,
      sessionId: session.id,
      eventId,
      orderId,
      error: launchOrder.error,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: launchOrder.error }, { status: launchOrder.error === "storage_not_configured" ? 503 : 500 });
  }
  const fulfillmentJobId = await startFulfillmentJob(eventId, orderId);
  if (!fulfillmentJobId) return NextResponse.json({ error: "fulfillment_store_failed" }, { status: 503 });

  let provisionedDomain: ProvisionedDomain | null = null;
  if (launchOrder.domain) {
    const provisioned = await provisionPurchasedDomain(launchOrder.domain, launchOrder.registrant!);
    if (!provisioned.ok) {
      await markFulfillment({ eventRowId: storedEvent.eventRowId, jobId: fulfillmentJobId, state: "retry", errorCode: provisioned.error.slice(0, 120) });
      logPaymentEvent("error", "domain_provisioning_failed", {
        requestId,
        stripeEventId: event.id,
        sessionId: session.id,
        eventId,
        orderId,
        domain: launchOrder.domain,
        error: provisioned.error,
      });
      return NextResponse.json({ error: "domain_provisioning_failed" }, { status: 500 });
    }
    provisionedDomain = provisioned.provisioned;
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const { data, error } = await launchOrder.client.rpc("fulfill_event_launch", {
    p_event_id: eventId,
    p_order_id: orderId,
    p_version_id: versionId,
    p_stripe_session_id: session.id,
    p_stripe_event_id: event.id,
    p_payment_intent_id: paymentIntentId,
    p_amount_total: session.amount_total,
    p_currency: session.currency,
    p_ai_bonus_cents: AI_LAUNCH_BONUS_CENTS,
    p_domain: provisionedDomain?.domain ?? null,
    p_domain_provider_id: provisionedDomain?.providerId ?? null,
    p_domain_registration_cost: provisionedDomain?.registrationCost ?? null,
    p_domain_renewal_cost: provisionedDomain?.renewalCost ?? null,
  });

  if (error || !data) {
    await markFulfillment({ eventRowId: storedEvent.eventRowId, jobId: fulfillmentJobId, state: "retry", errorCode: error?.code ?? "fulfillment_failed" });
    logPaymentEvent("error", "launch_fulfillment_failed", {
      requestId,
      stripeEventId: event.id,
      sessionId: session.id,
      eventId,
      orderId,
      errorCode: error?.code,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "fulfillment_failed" }, { status: 500 });
  }

  const verification = await verifyLaunchFulfillment({
    client: launchOrder.client,
    eventId,
    orderId,
    versionId,
    stripeSessionId: session.id,
  });
  if (!verification.ok) {
    await markFulfillment({ eventRowId: storedEvent.eventRowId, jobId: fulfillmentJobId, state: "retry", errorCode: verification.error });
    logPaymentEvent("error", "launch_fulfillment_postcondition_failed", {
      requestId,
      stripeEventId: event.id,
      sessionId: session.id,
      eventId,
      orderId,
      error: verification.error,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "fulfillment_verification_failed" }, { status: 500 });
  }

  if (provisionedDomain) await deleteRegistrantPayload(orderId);
  if (!(await markFulfillment({ eventRowId: storedEvent.eventRowId, jobId: fulfillmentJobId, state: provisionedDomain ? "domain_active" : "service_active" }))) {
    return NextResponse.json({ error: "fulfillment_record_failed" }, { status: 500 });
  }

  const result = data as { duplicate?: boolean };
  logPaymentEvent("info", "launch_fulfillment_succeeded", {
    requestId,
    stripeEventId: event.id,
    sessionId: session.id,
    eventId,
    orderId,
    duplicate: result.duplicate === true,
    hasDomain: Boolean(provisionedDomain),
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ ok: true, duplicate: result.duplicate === true });
}
