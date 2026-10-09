import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LandingPage } from "@/components/landing-page";
import { seoLandingPages } from "@/lib/seo-landing-pages";

const session = vi.hoisted(() => ({ signedIn: false }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
// The page is static; the signed-in state comes from the session cookie in the browser.
vi.mock("@/hooks/use-signed-in", () => ({ useSignedIn: () => session.signedIn }));

describe("landing page", () => {
  it("uses only working homepage anchors and application destinations", () => {
    const html = renderToStaticMarkup(<LandingPage authConfigured signupEnabled />);

    for (const href of ["#top", "#product", "#how-it-works", "#pricing", "#questions", "/login?next=/app", "/contact"]) {
      expect(html).toContain(`href=\"${href}\"`);
    }
    expect(html).not.toContain("/demo-wedding");
    expect(html).toContain('aria-controls="landing-mobile-navigation"');
  });

  it("links every SEO landing page from the use cases section", () => {
    const html = renderToStaticMarkup(<LandingPage authConfigured signupEnabled />);

    for (const page of Object.values(seoLandingPages)) expect(html).toContain(`href="/${page.slug}"`);
    expect(html).toContain('id="use-cases"');
    expect(html).toContain('href="/templates"');
  });

  it("adapts account and creation calls to the active auth state", () => {
    session.signedIn = true;
    const authenticated = renderToStaticMarkup(<LandingPage authConfigured signupEnabled />);
    session.signedIn = false;
    const localDemo = renderToStaticMarkup(<LandingPage authConfigured={false} />);

    expect(authenticated).toContain('href="/app"');
    expect(authenticated).toContain("My events");
    expect(authenticated).toContain("New event");
    expect(localDemo).toContain("Open local demo");
    expect(localDemo).toContain("Start building");
  });

  it("keeps the real event brief composer and compact FAQ available without the removed capability section", () => {
    const html = renderToStaticMarkup(<LandingPage authConfigured signupEnabled />);

    expect(html).toContain('id="event-brief"');
    expect(html).toContain("Start building");
    expect(html).toContain('aria-label="Event type"');
    expect(html).toContain("Do I need to know how to build a website?");
    expect(html).not.toContain("A site with a point of view.");
    expect(html).not.toContain("An elegant wedding celebration");
    expect(html).not.toContain("Try an idea");
  });
});
