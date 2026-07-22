import Stripe from "stripe";
import { domainProvider } from "@/lib/domains/provider";
import { appUrl, domainPriceCapUsd, env, isDomainPurchasingConfigured } from "@/lib/env";
import { LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";
import { serviceSupabase } from "@/lib/supabase/server";
import { domainSchema, evaluateDomainQuote } from "@/lib/validation";
import { domainRegistrantSchema, storeRegistrantPayload, deleteRegistrantPayload, type DomainRegistrant } from "@/lib/domains/registrant";

export function stripeClient() {
  const key = env.stripeSecretKey();
  if (!key) {
    return null;
  }

  return new Stripe(key, {
    apiVersion: "2026-05-27.dahlia",
  });
}

export async function createLaunchCheckoutSession(input: { eventId: string; ownerId: string; customerEmail?: string | null; domain?: string | null; registrant?: DomainRegistrant | null; acceptance?: { version: string; ipHash: string | null; userAgentClass: string } }) {
  const stripe = stripeClient();
  const client = serviceSupabase();
  if (!stripe || !client) {
    return { ok: false as const, error: "stripe_not_configured" };
  }

  const { data: event } = await client
    .from("events")
    .select("id, owner_id, organization_id, slug, draft_version_id")
    .eq("id", input.eventId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();
  if (!event) return { ok: false as const, error: "not_found" };
  if (!event.draft_version_id) return { ok: false as const, error: "site_version_missing" };

  if (!input.acceptance) return { ok: false as const, error: "legal_acceptance_required" };
  const requiredDocuments = input.domain ? ["terms", "privacy", "refunds", "domains"] : ["terms", "privacy", "refunds"];
  const { data: legalDocuments } = await client.from("legal_documents").select("id, document_key, version").eq("status", "active").eq("version", input.acceptance.version).in("document_key", requiredDocuments);
  if (!legalDocuments || legalDocuments.length !== requiredDocuments.length) return { ok: false as const, error: "legal_documents_not_ready" };

  const { data: entitlement } = await client
    .from("event_entitlements")
    .select("launch_order_id, status, expires_at")
    .eq("event_id", input.eventId)
    .maybeSingle();
  if (entitlement?.launch_order_id) {
    return { ok: false as const, error: entitlement.status === "active" && entitlement.expires_at && new Date(entitlement.expires_at) > new Date() ? "already_launched" : "renewal_not_available" };
  }

  let domainQuote: Awaited<ReturnType<ReturnType<typeof domainProvider>["check"]>>[number] | null = null;
  if (input.domain) {
    const parsed = domainSchema.safeParse(input.domain);
    if (!parsed.success) return { ok: false as const, error: "invalid_domain" };
    if (!isDomainPurchasingConfigured()) return { ok: false as const, error: "domain_purchasing_not_configured" };

    const quotes = await domainProvider().check([parsed.data]).catch(() => null);
    domainQuote = quotes?.find((quote) => quote.domain === parsed.data) ?? null;
    if (!domainQuote) return { ok: false as const, error: "domain_check_failed" };
    const evaluation = evaluateDomainQuote(domainQuote, domainPriceCapUsd());
    if (!evaluation.ok) return { ok: false as const, error: `domain_${evaluation.reason}` };
    if (!domainRegistrantSchema.safeParse(input.registrant).success) return { ok: false as const, error: "registrant_invalid" };
  }

  const domainAmountCents = domainQuote ? Math.round(domainQuote.registrationCost * 100) : 0;
  const orderAmountCents = LAUNCH_PRICE_CENTS + domainAmountCents;

  const orderMetadata = {
    product: "eventloom_launch",
    term_months: 12,
    ...(domainQuote ? {
      domain: domainQuote.domain,
      domain_registration_cost: domainQuote.registrationCost,
      domain_renewal_cost: domainQuote.renewalCost,
      domain_currency: domainQuote.currency,
    } : {}),
  };

  const { data: order, error: orderError } = await client
    .from("orders")
    .insert({
      event_id: event.id,
      organization_id: event.organization_id,
      status: "pending",
      kind: "event_launch",
      amount_total: orderAmountCents,
      currency: "usd",
      provider: "stripe",
      metadata: orderMetadata,
      site_version_id: event.draft_version_id,
    })
    .select("id")
    .single();
  if (orderError || !order) return { ok: false as const, error: "order_create_failed" };

  if (domainQuote && input.registrant && !(await storeRegistrantPayload(order.id, input.registrant))) {
    await client.from("orders").delete().eq("id", order.id);
    return { ok: false as const, error: "registrant_storage_failed" };
  }
  const { error: acceptanceError } = await client.from("legal_acceptances").insert(legalDocuments.map((document) => ({ document_id: document.id, user_id: input.ownerId, order_id: order.id, ip_hash: input.acceptance!.ipHash, user_agent_class: input.acceptance!.userAgentClass })));
  if (acceptanceError) {
    await deleteRegistrantPayload(order.id);
    await client.from("orders").delete().eq("id", order.id);
    return { ok: false as const, error: "legal_acceptance_failed" };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail ?? undefined,
    billing_address_collection: "auto",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: LAUNCH_PRICE_CENTS,
          product_data: { name: "Eventloom site launch", description: "One year of hosted event site access" },
        },
        quantity: 1,
      },
      ...(domainQuote ? [{ price_data: { currency: "usd", unit_amount: domainAmountCents, product_data: { name: `Domain registration: ${domainQuote.domain}`, description: `One-year registration. Renewal price currently USD ${domainQuote.renewalCost.toFixed(2)}; automatic renewal is off.` } }, quantity: 1 }] : []),
    ],
    success_url: `${appUrl()}/app/events/${input.eventId}/studio?checkout=success`,
    cancel_url: `${appUrl()}/app/events/${input.eventId}/studio?checkout=cancelled`,
    client_reference_id: order.id,
    metadata: {
      event_id: input.eventId,
      order_id: order.id,
      product: "eventloom_launch",
      version_id: event.draft_version_id,
      ...(domainQuote ? { domain: domainQuote.domain } : {}),
    },
    payment_intent_data: { metadata: { event_id: input.eventId, order_id: order.id, version_id: event.draft_version_id, product: "eventloom_launch", ...(domainQuote ? { domain: domainQuote.domain } : {}) } },
    consent_collection: { terms_of_service: "required" },
    custom_text: { submit: { message: domainQuote ? "The $20 Eventloom service is refundable within 14 days. A successfully registered domain is non-refundable except where required by law. Domain auto-renewal is off." : "The $20 Eventloom service is refundable within 14 days, subject to the displayed terms." } },
    });
  } catch {
    await deleteRegistrantPayload(order.id);
    await client.from("orders").delete().eq("id", order.id);
    return { ok: false as const, error: "checkout_create_failed" };
  }

  const { error: referenceError } = await client.from("orders").update({ provider_reference: session.id, updated_at: new Date().toISOString() }).eq("id", order.id);
  if (referenceError) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    await deleteRegistrantPayload(order.id);
    await client.from("orders").delete().eq("id", order.id);
    return { ok: false as const, error: "order_update_failed" };
  }

  return { ok: true as const, url: session.url, id: session.id };
}
