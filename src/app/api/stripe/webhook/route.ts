import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { AI_LAUNCH_BONUS_CENTS, LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";
import { stripeClient } from "@/lib/payments/stripe";
import { serviceSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const stripe = stripeClient();
  const secret = env.stripeWebhookSecret();
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!stripe || !secret || !signature) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true });
  }

  const session = event.data.object;
  const eventId = session.metadata?.event_id;
  const orderId = session.metadata?.order_id;
  const versionId = session.metadata?.version_id;
  if (!eventId || !orderId || !versionId || session.metadata?.product !== "eventloom_launch" || session.payment_status !== "paid") {
    return NextResponse.json({ error: "missing_metadata" }, { status: 400 });
  }

  const client = serviceSupabase();
  if (!client) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const { data: order } = await client
    .from("orders")
    .select("id, event_id, status, amount_total, currency, provider_reference, site_version_id")
    .eq("id", orderId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (
    !order ||
    order.amount_total !== LAUNCH_PRICE_CENTS ||
    order.currency !== "usd" ||
    order.provider_reference !== session.id ||
    order.site_version_id !== versionId ||
    session.client_reference_id !== orderId ||
    session.amount_total !== LAUNCH_PRICE_CENTS ||
    session.currency !== "usd"
  ) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  const { data: eventRecord } = await client.from("events").select("owner_id").eq("id", eventId).maybeSingle();
  if (!eventRecord?.owner_id) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const { data: existingEntitlement } = await client
    .from("event_entitlements")
    .select("launch_order_id")
    .eq("event_id", eventId)
    .maybeSingle();

  // Stripe may retry webhooks. An entitlement already attached to this order
  // means all side effects completed previously, so it is safe to acknowledge.
  if (existingEntitlement?.launch_order_id === orderId) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const startsAt = new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);

  await client.from("orders").update({ status: "paid", updated_at: startsAt.toISOString() }).eq("id", orderId);
  await client.from("payments").upsert({
    event_id: eventId,
    stripe_session_id: session.id,
    order_id: orderId,
    status: "paid",
    amount_total: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    provider: "stripe",
    metadata: { stripe_event_id: event.id, payment_intent: session.payment_intent },
  });
  await client
    .from("event_entitlements")
    .upsert({
      event_id: eventId,
      owner_id: eventRecord.owner_id,
      launch_order_id: orderId,
      status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: startsAt.toISOString(),
    })
    .eq("event_id", eventId);

  await client.rpc("grant_launch_ai_credit", {
    p_user_id: eventRecord.owner_id,
    p_order_id: orderId,
    p_amount_cents: AI_LAUNCH_BONUS_CENTS,
  });

  const { data: version } = await client.from("event_versions").select("id").eq("id", versionId).eq("event_id", eventId).maybeSingle();
  if (!version) return NextResponse.json({ error: "version_not_found" }, { status: 400 });
  await client.from("events").update({ status: "published", rsvp_open: true, published_version_id: versionId, published_at: startsAt.toISOString() }).eq("id", eventId);
  await client.from("page_artifacts").update({ status: "published" }).eq("event_id", eventId).eq("version_id", versionId);

  return NextResponse.json({ ok: true });
}
