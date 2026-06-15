import { NextRequest, NextResponse } from "next/server";
import { addDomainToVercelProject } from "@/lib/domains/vercel";
import { domainProvider } from "@/lib/domains/provider";
import { env } from "@/lib/env";
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
  const domain = session.metadata?.domain;
  if (!eventId || !domain) {
    return NextResponse.json({ error: "missing_metadata" }, { status: 400 });
  }

  const client = serviceSupabase();
  if (!client) {
    return NextResponse.json({ ok: true, demo: true });
  }

  await client.from("payments").upsert({
    event_id: eventId,
    stripe_session_id: session.id,
    status: "paid",
    amount_total: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
  });

  const registration = await domainProvider().register(domain);
  if (!registration.ok) {
    await client.from("domains").update({ status: "failed", failure_reason: registration.error }).eq("event_id", eventId).eq("domain", domain);
    return NextResponse.json({ ok: true, domain_status: "failed" });
  }

  const vercel = await addDomainToVercelProject(domain);
  await client
    .from("domains")
    .update({
      status: vercel.ok ? "vercel_pending" : "failed",
      provider_id: registration.providerId,
      failure_reason: vercel.ok ? null : vercel.error,
    })
    .eq("event_id", eventId)
    .eq("domain", domain);

  await client.from("events").update({ status: "published", rsvp_open: true }).eq("id", eventId);
  await client.from("page_artifacts").update({ status: "published" }).eq("event_id", eventId).eq("status", "draft");

  return NextResponse.json({ ok: true });
}
