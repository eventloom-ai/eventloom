import { NextRequest, NextResponse } from "next/server";
import { rootDomain } from "@/lib/env";
import { normalizeHost, slugFromHost } from "@/lib/tenancy";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
