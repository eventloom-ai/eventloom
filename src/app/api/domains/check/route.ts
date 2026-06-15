import { NextRequest, NextResponse } from "next/server";
import { domainProvider } from "@/lib/domains/provider";
import { domainPriceCapUsd } from "@/lib/env";
import { domainSchema, evaluateDomainQuote } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { domains?: unknown } | null;
  const domains = Array.isArray(body?.domains) ? body.domains : [];
  const parsed = domains.map((domain) => domainSchema.safeParse(domain)).filter((result) => result.success);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "invalid_domains" }, { status: 400 });
  }

  const quotes = await domainProvider().check(parsed.map((result) => result.data)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "domain_check_failed";
    return { error: message };
  });

  if (!Array.isArray(quotes)) {
    return NextResponse.json({ error: quotes.error }, { status: 502 });
  }

  const cap = domainPriceCapUsd();
  return NextResponse.json({
    capUsd: cap,
    quotes: quotes.map((quote) => ({ ...quote, included: evaluateDomainQuote(quote, cap).ok })),
  });
}
