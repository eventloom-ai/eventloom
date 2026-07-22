import { NextRequest, NextResponse } from "next/server";
import { domainProvider } from "@/lib/domains/provider";
import { domainPriceCapUsd, publicDomainPurchasingEnabled } from "@/lib/env";
import { domainSchema, evaluateDomainQuote } from "@/lib/validation";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export async function POST(req: NextRequest) {
  if (!publicDomainPurchasingEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 8_192)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!auth.emailVerified || !hasRequiredMfa(auth)) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { domains?: unknown } | null;
  const domains = Array.isArray(body?.domains) ? body.domains : [];
  const parsed = domains.slice(0, 10).map((domain) => domainSchema.safeParse(domain)).filter((result) => result.success);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "invalid_domains" }, { status: 400 });
  }

  let provider;
  try {
    provider = domainProvider();
  } catch {
    return NextResponse.json({ error: "domain_registrar_not_configured" }, { status: 503 });
  }

  const quotes = await provider.check(parsed.map((result) => result.data)).catch((error: unknown) => {
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
