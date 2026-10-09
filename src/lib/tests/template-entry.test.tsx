import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ authConfigured: true, signupEnabled: true }));
vi.mock("@/lib/supabase/public-env", () => ({ hasSupabasePublicEnv: () => flags.authConfigured, supabasePublicEnv: { url: "", key: "" } }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, publicSignupEnabled: () => flags.signupEnabled };
});

import { OccasionTemplatePage } from "@/components/occasion-template-page";
import { eventDraftEntryPath } from "@/lib/event-entry";
import { getOccasionTemplate, occasionTemplateBrief, occasionTemplateHref } from "@/lib/occasion-templates";

const occasion = getOccasionTemplate("wedding")!;
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;");
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&"));

afterEach(() => {
  flags.authConfigured = true;
  flags.signupEnabled = true;
});

describe("Use this template (static page, signed-out render)", () => {
  it("sends signed-out visitors to sign up, then back to the template's draft", () => {
    const html = renderToStaticMarkup(<OccasionTemplatePage occasion={occasion} />);
    const signup = eventDraftEntryPath({ brief: occasionTemplateBrief(occasion), authenticated: false, signupEnabled: true });
    expect(signup.startsWith("/signup?next=%2Fapp%2Fevents%2Fnew%3Fbrief%3D")).toBe(true);
    expect(html).toContain(`href="${escapeHtml(signup)}"`);
    // Header, hero and closing CTAs, plus one "Start" per extra style; none go to /login or straight to /app.
    expect(hrefs(html).filter((href) => href.startsWith("/signup?next="))).toHaveLength(3 + occasion.styles.length);
    expect(hrefs(html).some((href) => href.startsWith("/login") || href.startsWith("/app/"))).toBe(false);
    for (const style of occasion.styles) {
      const next = new URL(eventDraftEntryPath({ brief: occasionTemplateBrief(occasion, style.mood), authenticated: false, signupEnabled: true }), "https://eventloom.co").searchParams.get("next");
      expect(next).toBe(occasionTemplateHref(occasion, style.mood));
    }
  });

  it("uses sign in while public signup is off, and the draft itself when auth is not configured (demo mode)", () => {
    flags.signupEnabled = false;
    expect(hrefs(renderToStaticMarkup(<OccasionTemplatePage occasion={occasion} />)).filter((href) => href.startsWith("/login?next="))).toHaveLength(3 + occasion.styles.length);
    flags.authConfigured = false;
    expect(renderToStaticMarkup(<OccasionTemplatePage occasion={occasion} />)).toContain(`href="${escapeHtml(occasionTemplateHref(occasion))}"`);
  });
});
