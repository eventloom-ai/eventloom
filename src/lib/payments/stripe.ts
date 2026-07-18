import Stripe from "stripe";
import { appUrl, env } from "@/lib/env";
import { LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";
import { serviceSupabase } from "@/lib/supabase/server";

export function stripeClient() {
  const key = env.stripeSecretKey();
  if (!key) {
    return null;
  }

  return new Stripe(key, {
    apiVersion: "2026-05-27.dahlia",
  });
}

export async function createLaunchCheckoutSession(input: { eventId: string; ownerId: string; customerEmail?: string | null }) {
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

  const { data: entitlement } = await client
    .from("event_entitlements")
    .select("launch_order_id, status, expires_at")
    .eq("event_id", input.eventId)
    .maybeSingle();
  if (entitlement?.launch_order_id) {
    return { ok: false as const, error: entitlement.status === "active" && entitlement.expires_at && new Date(entitlement.expires_at) > new Date() ? "already_launched" : "renewal_not_available" };
  }

  const { data: order, error: orderError } = await client
    .from("orders")
    .insert({
      event_id: event.id,
      organization_id: event.organization_id,
      status: "pending",
      kind: "event_launch",
      amount_total: LAUNCH_PRICE_CENTS,
      currency: "usd",
      provider: "stripe",
      metadata: { product: "eventloom_launch", term_months: 12 },
      site_version_id: event.draft_version_id,
    })
    .select("id")
    .single();
  if (orderError || !order) return { ok: false as const, error: "order_create_failed" };

  const session = await stripe.checkout.sessions.create({
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
    ],
    success_url: `${appUrl()}/app/events/${input.eventId}/studio?checkout=success`,
    cancel_url: `${appUrl()}/app/events/${input.eventId}/studio?checkout=cancelled`,
    client_reference_id: order.id,
    metadata: {
      event_id: input.eventId,
      order_id: order.id,
      product: "eventloom_launch",
      version_id: event.draft_version_id,
    },
    payment_intent_data: { metadata: { event_id: input.eventId, order_id: order.id, version_id: event.draft_version_id, product: "eventloom_launch" } },
  });

  await client.from("orders").update({ provider_reference: session.id, updated_at: new Date().toISOString() }).eq("id", order.id);

  return { ok: true as const, url: session.url, id: session.id };
}
