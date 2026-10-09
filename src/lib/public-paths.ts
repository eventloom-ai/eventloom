// Marketing and SEO pages that render identically for every visitor. They are prerendered, so the proxy must not
// force `no-store` on them (that keeps them out of the CDN) and cannot rely on a per-request CSP nonce.
const PUBLIC_STATIC_SEGMENTS = new Set([
  "templates", "compare", "guides", "legal", "contact", "ip", "llms.txt", "robots.txt", "sitemap.xml", "opengraph-image",
  "birthday-event-website", "event-website-builder", "online-rsvp", "private-event-website", "rsvp-website", "wedding-rsvp-website",
]);

export function isPublicStaticPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_STATIC_SEGMENTS.has(pathname.split("/")[1] ?? "");
}
