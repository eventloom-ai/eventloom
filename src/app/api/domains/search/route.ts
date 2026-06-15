import { NextRequest, NextResponse } from "next/server";
import { domainProvider } from "@/lib/domains/provider";
import { domainPriceCapUsd } from "@/lib/env";
import { evaluateDomainQuote } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  const quotes = await domainProvider().search(query).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "domain_search_failed";
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
