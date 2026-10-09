import { describe, expect, it } from "vitest";
import { hasSessionCookie } from "@/hooks/use-signed-in";
import { isPublicStaticPath } from "@/lib/public-paths";
import { seoLandingPages } from "@/lib/seo-landing-pages";

describe("isPublicStaticPath", () => {
  it("covers marketing, template, comparison and SEO landing pages", () => {
    for (const path of ["/", "/templates", "/templates/wedding", "/compare/zola", "/guides/best-rsvp-website-builders", "/legal/terms", "/llms.txt", "/sitemap.xml"]) expect(isPublicStaticPath(path), path).toBe(true);
    for (const page of Object.values(seoLandingPages)) expect(isPublicStaticPath(`/${page.slug}`), page.slug).toBe(true);
  });

  it("never covers creator, auth, admin, API or event pages", () => {
    for (const path of ["/app", "/app/events/new", "/login", "/signup", "/auth/callback", "/admin", "/api/rsvp", "/studio", "/laylas-30th", "/sites/example.com"]) expect(isPublicStaticPath(path), path).toBe(false);
  });
});

describe("hasSessionCookie", () => {
  it("detects whole and chunked Supabase session cookies only", () => {
    expect(hasSessionCookie("theme=dark; sb-fofrltfrdfwpwsuqnwki-auth-token=base64-abc")).toBe(true);
    expect(hasSessionCookie("sb-ref-auth-token.0=abc; sb-ref-auth-token.1=def")).toBe(true);
    expect(hasSessionCookie("theme=dark; sb-ref-auth-token-code-verifier=x")).toBe(false);
    expect(hasSessionCookie("")).toBe(false);
  });
});
