// Marketing and SEO pages that render identically for every visitor. They are prerendered, so the proxy must not
// force `no-store` on them (that keeps them out of the CDN) and cannot rely on a per-request CSP nonce.
const PUBLIC_STATIC_SEGMENTS = new Set([
  "templates", "compare", "guides", "legal", "contact", "report", "ip", "llms.txt", "robots.txt", "sitemap.xml", "opengraph-image",
  "birthday-event-website", "event-website-builder", "online-rsvp", "private-event-website", "rsvp-website", "wedding-rsvp-website",
]);

// Share images (/<slug>/opengraph-image/<id>, /sites/<host>/opengraph-image/<id>) carry no per-visitor data and set
// their own Cache-Control, keyed by a content-hash id.
const SHARE_IMAGE = /^\/(?:sites\/)?[^/]+\/opengraph-image(?:\/[^/]+)?$/;

export function isPublicStaticPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_STATIC_SEGMENTS.has(pathname.split("/")[1] ?? "") || SHARE_IMAGE.test(pathname);
}
