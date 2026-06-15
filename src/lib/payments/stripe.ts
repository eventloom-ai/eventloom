import Stripe from "stripe";
import { appUrl, env } from "@/lib/env";

export function stripeClient() {
  const key = env.stripeSecretKey();
  if (!key) {
    return null;
  }

  return new Stripe(key, {
    apiVersion: "2026-05-27.dahlia",
  });
}

export async function createCheckoutSession(input: { eventId: string; domain: string }) {
  const stripe = stripeClient();
  const priceId = env.stripePriceId();
  if (!stripe || !priceId) {
    return { ok: false as const, error: "stripe_not_configured" };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/app/events/${input.eventId}?checkout=success`,
    cancel_url: `${appUrl()}/app/events/${input.eventId}?checkout=cancelled`,
    metadata: {
      event_id: input.eventId,
      domain: input.domain,
    },
  });

  return { ok: true as const, url: session.url, id: session.id };
}
