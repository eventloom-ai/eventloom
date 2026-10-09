import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/app/events/new" }));

import { RsvpConfirmation } from "@/components/rsvp-form";
import { SiteBuildStudio } from "@/components/site-build-studio";
import { briefPaletteMood } from "@/lib/event-entry";
import { guestReferralUrl, rsvpGrowthHref } from "@/lib/growth-links";
import { getOccasionTemplate, occasionTemplateBrief } from "@/lib/occasion-templates";

describe("post-RSVP growth card", () => {
  it("links to the absolute app homepage with guest_rsvp attribution for the event", () => {
    expect(rsvpGrowthHref({ slug: "laylas-30th", status: "published" }, "https://eventloom.co/")).toBe(
      "https://eventloom.co/?utm_source=guest_rsvp&utm_medium=referral&utm_campaign=laylas-30th",
    );
    expect(guestReferralUrl("https://eventloom.co", "guest_page", "a b&c")).toBe(
      "https://eventloom.co/?utm_source=guest_page&utm_medium=referral&utm_campaign=a%20b%26c",
    );
  });

  it("is never offered on a draft or archived event (the host previewing their own page)", () => {
    expect(rsvpGrowthHref({ slug: "laylas-30th", status: "draft" }, "https://eventloom.co")).toBeUndefined();
    expect(rsvpGrowthHref({ slug: "laylas-30th", status: "archived" }, "https://eventloom.co")).toBeUndefined();
  });

  it("shows a small dismissible card under the confirmation only when a link is given", () => {
    const href = rsvpGrowthHref({ slug: "laylas-30th", status: "published" }, "https://eventloom.co")!;
    const html = renderToStaticMarkup(<RsvpConfirmation growthHref={href} />);
    expect(html).toContain("Reply received");
    expect(html).toContain("Planning something too?");
    expect(html).toContain(`href="${href.replaceAll("&", "&amp;")}"`);
    expect(html).toContain('aria-label="Dismiss"');
    // An aside, so the designed RSVP slot's form/section skin leaves it neutral.
    expect(html).toMatch(/<aside[^>]*aria-label="Make your own event site"/);
    expect(renderToStaticMarkup(<RsvpConfirmation />)).not.toContain("Planning something too?");
  });
});

describe("builder intake palette from a template brief", () => {
  const moods = ["blush", "navy", "gold", "lavender", "forest", "sunset"] as const;

  it("reads the palette word a template brief names", () => {
    const wedding = getOccasionTemplate("wedding")!;
    expect(briefPaletteMood(occasionTemplateBrief(wedding, "forest"), moods)).toBe("forest");
    expect(briefPaletteMood("A navy and gold gala", moods)).toBeNull();
    expect(briefPaletteMood("Use the teal color palette.", moods)).toBeNull();
    expect(briefPaletteMood(undefined, moods)).toBeNull();
  });

  it("pre-selects that chip in the build studio", () => {
    const brief = occasionTemplateBrief(getOccasionTemplate("birthday")!, "lavender");
    const html = renderToStaticMarkup(<SiteBuildStudio initialPrompt={brief} />);
    const selected = [...html.matchAll(/<button[^>]*class="[^"]*bg-violet-500 text-white[^"]*"[^>]*>([a-z]+)<\/button>/g)].map((match) => match[1]);
    expect(selected).toEqual(["lavender"]);
    const plain = renderToStaticMarkup(<SiteBuildStudio initialPrompt="A cozy autumn birthday dinner" />);
    expect(plain).not.toMatch(/bg-violet-500 text-white[^"]*"[^>]*>(?:blush|navy|gold|lavender|forest|sunset)</);
  });
});
