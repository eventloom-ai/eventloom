import { NextRequest, NextResponse } from "next/server";
import { loginUrlForProtectedRequest } from "@/lib/auth/redirect";
import { isSupabaseConfigured, rootDomain } from "@/lib/env";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";
import { normalizeHost, slugFromHost } from "@/lib/tenancy";

const authRoutes = ["/login", "/signup", "/auth"];

function noncePolicy(nonce: string) {
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://*.ingest.sentry.io; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; report-uri /api/csp-report; upgrade-insecure-requests`.replace(/\s{2,}/g, " ").trim();
}

function secureResponse(response: NextResponse, csp: string) {
  const header = process.env.CSP_ENFORCE_ENABLED === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
  response.headers.set(header, csp);
  response.headers.set("Cache-Control", response.headers.get("Cache-Control") ?? "private, no-store");
  return response;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = noncePolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  if (pathname.startsWith("/app") || pathname.startsWith("/admin") || authRoutes.some((route) => pathname.startsWith(route))) {
    if (isSupabaseConfigured()) {
      const { response, user } = await refreshSupabaseSession(req, requestHeaders);
      if ((pathname.startsWith("/app") || pathname.startsWith("/admin")) && !user) {
        const url = loginUrlForProtectedRequest(req.nextUrl);
        return secureResponse(NextResponse.redirect(url), csp);
      }
      if ((pathname === "/login" || pathname === "/signup") && user) return secureResponse(NextResponse.redirect(new URL("/app", req.url)), csp);
      return secureResponse(response, csp);
    }
  }

  if (pathname.startsWith("/app") || pathname.startsWith("/admin") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  const host = normalizeHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "");
  const hostTenant = slugFromHost(host, rootDomain());
  if (!hostTenant) return secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  const url = req.nextUrl.clone();
  url.pathname = `/sites/${encodeURIComponent(hostTenant)}`;
  return secureResponse(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), csp);
}

export const config = {
  matcher: [{ source: "/((?!api|_next/static|_next/image|favicon.ico).*)", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] }],
};
