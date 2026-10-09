// Event slugs are served at /<slug> and <slug>.<root domain>, so they must never shadow an app route
// (keep in sync with the top-level entries of src/app) or a name that reads as an official Eventloom host.
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Top-level routes and metadata files in src/app.
  "admin", "api", "app", "auth", "contact", "demo-wedding", "favicon", "icon", "ip", "legal", "login", "opengraph-image",
  "privacy", "robots", "signup", "sitemap", "sites", "studio", "templates",
  // SEO landing pages (src/lib/seo-landing-pages.ts).
  "birthday-event-website", "event-website-builder", "online-rsvp", "private-event-website", "rsvp-website", "wedding-rsvp-website",
  // Platform, infrastructure and impersonation-prone names.
  "abuse", "about", "account", "assets", "billing", "blog", "cdn", "dashboard", "dev", "docs", "email", "eventloom", "events",
  "ftp", "help", "home", "hostmaster", "logout", "mail", "new", "ns1", "ns2", "postmaster", "preview", "pricing", "root",
  "security", "settings", "smtp", "staging", "static", "status", "support", "terms", "webmaster", "www",
]);

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}
