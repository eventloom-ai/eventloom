import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LandingPage } from "@/components/landing-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("landing page", () => {
  it("uses only working homepage anchors and application destinations", () => {
    const html = renderToStaticMarkup(<LandingPage authConfigured signupEnabled />);

    for (const href of ["#product", "#how-it-works", "#pricing", "#questions", "#create", "/login?next=/app", "/contact"]) {
      expect(html).toContain(`href=\"${href}\"`);
    }
    expect(html).not.toContain("/demo-wedding");
    expect(html).toContain('aria-controls="landing-mobile-navigation"');
  });

  it("adapts account and creation calls to the active auth state", () => {
    const authenticated = renderToStaticMarkup(<LandingPage authenticated authConfigured signupEnabled />);
    const localDemo = renderToStaticMarkup(<LandingPage authConfigured={false} />);

    expect(authenticated).toContain('href="/app"');
    expect(authenticated).toContain("My events");
    expect(authenticated).toContain("New event");
    expect(localDemo).toContain("Open local demo");
    expect(localDemo).toContain("Start building");
  });

  it("keeps the real event brief composer and compact FAQ available", () => {
    const html = renderToStaticMarkup(<LandingPage authConfigured signupEnabled />);

    expect(html).toContain('id="event-brief"');
    expect(html).toContain("Start building");
    expect(html).toContain('aria-label="Event type"');
    expect(html).toContain("Do I need to know how to build a website?");
    expect(html).toContain("A site with a point of view.");
  });
});
