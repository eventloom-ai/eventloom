import { NextRequest, NextResponse } from "next/server";
import { domainProvider } from "@/lib/domains/provider";
import { domainPriceCapUsd, publicDomainPurchasingEnabled } from "@/lib/env";
import { evaluateDomainQuote } from "@/lib/validation";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";

export async function GET(req: NextRequest) {
  if (!publicDomainPurchasingEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!auth.emailVerified || !hasRequiredMfa(auth)) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length > 80) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  let provider;
  try {
    provider = domainProvider();
  } catch {
    return NextResponse.json({ error: "domain_registrar_not_configured" }, { status: 503 });
  }

  const quotes = await provider.search(query).catch((error: unknown) => {
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
