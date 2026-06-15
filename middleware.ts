import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, rootDomain } from "@/lib/env";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";
import { normalizeHost, slugFromHost } from "@/lib/tenancy";

const authRoutes = ["/login", "/signup", "/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/app") || authRoutes.some((route) => pathname.startsWith(route))) {
    if (isSupabaseConfigured()) {
      const { response, user } = await refreshSupabaseSession(req);

      if (pathname.startsWith("/app") && !user) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }

      if ((pathname === "/login" || pathname === "/signup") && user) {
        return NextResponse.redirect(new URL("/app", req.url));
      }

      return response;
    }
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const host = normalizeHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "");
  const hostTenant = slugFromHost(host, rootDomain());
  if (!hostTenant) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/sites/${encodeURIComponent(hostTenant)}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
