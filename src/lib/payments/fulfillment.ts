import { domainSchema } from "@/lib/validation";
import { serviceSupabase } from "@/lib/supabase/server";
import { loadRegistrantPayload } from "@/lib/domains/registrant";

type LaunchOrderInput = {
  eventId: string;
  orderId: string;
  versionId: string;
  stripeSessionId: string;
  amountTotal: number;
  currency: string;
  requestedDomain?: string | null;
};

type FulfillmentVerificationInput = {
  client: NonNullable<ReturnType<typeof serviceSupabase>>;
  eventId: string;
  orderId: string;
  versionId: string;
  stripeSessionId: string;
};

export async function loadLaunchOrderForProvisioning(input: LaunchOrderInput) {
  const client = serviceSupabase();
  if (!client) return { ok: false as const, error: "storage_not_configured" };

  const { data: order, error } = await client
    .from("orders")
    .select("id, event_id, status, kind, provider, provider_reference, amount_total, currency, site_version_id, metadata")
    .eq("id", input.orderId)
    .eq("event_id", input.eventId)
    .maybeSingle();
  if (error || !order) return { ok: false as const, error: "launch_order_not_found" };

  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const storedDomain = typeof metadata.domain === "string" ? domainSchema.safeParse(metadata.domain) : null;
  const domain = storedDomain?.success ? storedDomain.data : null;
  const requestedDomain = input.requestedDomain ? domainSchema.safeParse(input.requestedDomain) : null;
  if (
    (order.status !== "pending" && order.status !== "paid") ||
    order.kind !== "event_launch" ||
    order.provider !== "stripe" ||
    order.provider_reference !== input.stripeSessionId ||
    order.amount_total !== input.amountTotal ||
    order.currency?.toLowerCase() !== input.currency.toLowerCase() ||
    order.site_version_id !== input.versionId ||
    Boolean(input.requestedDomain) !== Boolean(domain) ||
    (requestedDomain?.success ? requestedDomain.data : null) !== domain
  ) {
    return { ok: false as const, error: "invalid_launch_order" };
  }

  if (domain) {
    const { data: claim, error: claimError } = await client.rpc("claim_domain_fulfillment", {
      p_event_id: input.eventId,
      p_order_id: input.orderId,
      p_domain: domain,
    });
    if (claimError || !claim) return { ok: false as const, error: "domain_claim_failed" };
  }

  const registrant = domain ? await loadRegistrantPayload(input.orderId) : null;
  if (domain && !registrant) return { ok: false as const, error: "registrant_payload_missing" };

  return { ok: true as const, client, domain, registrant };
}

export async function verifyLaunchFulfillment(input: FulfillmentVerificationInput) {
  const [orderResult, paymentResult, entitlementResult, eventResult] = await Promise.all([
    input.client.from("orders").select("status").eq("id", input.orderId).eq("event_id", input.eventId).maybeSingle(),
    input.client.from("payments").select("status").eq("order_id", input.orderId).eq("stripe_session_id", input.stripeSessionId).maybeSingle(),
    input.client.from("event_entitlements").select("status, launch_order_id, expires_at").eq("event_id", input.eventId).maybeSingle(),
    input.client.from("events").select("status, rsvp_open, published_version_id").eq("id", input.eventId).maybeSingle(),
  ]);

  if (orderResult.error || orderResult.data?.status !== "paid") {
    return { ok: false as const, error: "order_not_paid" };
  }
  if (paymentResult.error || paymentResult.data?.status !== "paid") {
    return { ok: false as const, error: "payment_not_recorded" };
  }

  const entitlement = entitlementResult.data;
  if (
    entitlementResult.error ||
    entitlement?.status !== "active" ||
    entitlement.launch_order_id !== input.orderId ||
    !entitlement.expires_at ||
    new Date(entitlement.expires_at) <= new Date()
  ) {
    return { ok: false as const, error: "entitlement_not_active" };
  }

  const event = eventResult.data;
  if (
    eventResult.error ||
    event?.status !== "published" ||
    event.rsvp_open !== true ||
    event.published_version_id !== input.versionId
  ) {
    return { ok: false as const, error: "event_not_published" };
  }

  return { ok: true as const };
}
