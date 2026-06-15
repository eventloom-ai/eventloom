import { NextRequest, NextResponse } from "next/server";
import { domainProvider } from "@/lib/domains/provider";
import { domainPriceCapUsd } from "@/lib/env";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { serviceSupabase } from "@/lib/supabase/server";
import { domainSchema, evaluateDomainQuote } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const contentType = req.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await req.json()
    : Object.fromEntries((await req.formData()).entries());

  const parsedDomain = domainSchema.safeParse(body.domain);
  if (!parsedDomain.success) {
    return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
  }

  const [quote] = await domainProvider().check([parsedDomain.data]);
  const quoteResult = quote ? evaluateDomainQuote(quote, domainPriceCapUsd()) : { ok: false as const, reason: "unavailable" };
  if (!quoteResult.ok) {
    return NextResponse.json({ error: quoteResult.reason, quote }, { status: 422 });
  }

  const client = serviceSupabase();
  if (client) {
    await client.from("domains").upsert({
      event_id: eventId,
      domain: parsedDomain.data,
      status: "quoted",
      registration_cost_usd: quote.registrationCost,
      renewal_cost_usd: quote.renewalCost,
    });
  }

  const checkout = await createCheckoutSession({ eventId, domain: parsedDomain.data });
  if (!checkout.ok) {
    return NextResponse.json({ ok: true, status: "checkout_not_configured", domain: parsedDomain.data });
  }

  return NextResponse.redirect(checkout.url!, { status: 303 });
}
