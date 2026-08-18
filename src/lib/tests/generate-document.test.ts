import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultEventConfig } from "@/lib/ai/generator";
import { generateOriginalSite } from "@/lib/agent/generate-document";
import { walkSiteNodes } from "@/lib/site-document";

const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

const emptyStyle = {
  background: null, color: null, accent: null, align: "left", width: null, padding: null, gap: null, radius: null,
  columns: null, minHeight: null, font: null, size: null, weight: null, texture: null, letterSpacing: null,
  italic: null, opacity: null, border: null, justify: null, rotate: null, offset: null,
};

function minimalResponse(overrides: { theme?: Record<string, unknown>; extraBlocks?: unknown[] }) {
  return {
    message: "A design.",
    summary: "Created a page",
    concept: "A simple concept.",
    locale: "en",
    direction: "auto",
    theme: { text: "#241814", surface: "#f6efe6", accent: "#9a6a4a", muted: "#6d5a4c", display: "romantic", body: "humanist", radius: "soft", motion: "subtle", texture: "paper", ...overrides.theme },
    event: { title: "Osama & Nour", subtitle: "The wedding of Osama & Nour", eventType: "wedding", date: "Date to be announced", venueName: "Venue to be announced", venueAddress: "", rsvpDeadline: "", schedule: [{ title: "Event details", time: "Time to be announced", location: "", description: "Details to be announced." }] },
    sections: [
      {
        type: "section",
        label: "Invitation",
        style: { ...emptyStyle, background: "#241814", color: "#f6efe6", padding: "hero" },
        rows: [
          {
            type: "stack",
            label: "Names",
            style: { ...emptyStyle },
            blocks: [
              { type: "text", content: null, binding: "event.title", variant: "heading", url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, dividerVariant: null, showMap: null, heading: null, description: null, style: { ...emptyStyle } },
              { type: "rsvp", content: null, binding: null, variant: null, url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, dividerVariant: null, showMap: null, heading: "Save a place", description: "Please reply.", style: { ...emptyStyle } },
              ...(overrides.extraBlocks ?? []),
            ],
          },
        ],
      },
    ],
  };
}

describe("original site generation", () => {
  it("falls back to a prompt-composed document without canned headings when no model is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const prompt = "Wedding event. i have a wedding of my brother osama and nour";
    const generated = await generateOriginalSite(prompt, defaultEventConfig(prompt));
    const copy = walkSiteNodes(generated.document).flatMap((node) => node.type === "text" && node.content ? [node.content] : []);

    expect(copy).not.toContain("The celebration");
    expect(copy).not.toContain("Meet us there");
    expect(walkSiteNodes(generated.document).some((node) => node.type === "rsvp")).toBe(true);
    expect(generated.document.theme.texture).toBeTruthy();
  });

  it("uses the model document when the response is valid", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          message: "I designed a first version around Osama and Nour.",
          summary: "Created an original wedding page",
          concept: "A full-bleed ink field with stacked names and a quiet reply.",
          locale: "en",
          direction: "auto",
          theme: { text: "#241814", surface: "#f6efe6", accent: "#9a6a4a", muted: "#6d5a4c", display: "romantic", body: "humanist", radius: "soft", motion: "subtle", texture: "paper" },
          event: { title: "Osama & Nour", subtitle: "A wedding for Osama and Nour.", eventType: "wedding", date: "Date to be announced", venueName: "Venue to be announced", venueAddress: "", rsvpDeadline: "", schedule: [{ title: "Event details", time: "Time to be announced", location: "", description: "Details to be announced." }] },
          sections: [
            {
              type: "section",
              label: "Invitation",
              style: { ...emptyStyle, background: "#241814", color: "#f6efe6", padding: "hero", gap: "medium", minHeight: "screen", texture: "paper", justify: "end", align: "left", width: "full" },
              rows: [
                {
                  type: "stack",
                  label: "Names",
                  style: { ...emptyStyle, gap: "medium", align: "left" },
                  blocks: [
                    { type: "text", content: "Together", binding: null, variant: "eyebrow", url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, showMap: null, heading: null, description: null, style: { ...emptyStyle, font: "body", size: "xs", weight: "semibold", letterSpacing: "widest" } },
                    { type: "text", content: null, binding: "event.title", variant: "heading", url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, showMap: null, heading: null, description: null, style: { ...emptyStyle, font: "display", size: "hero", italic: true, letterSpacing: "tight" } },
                    { type: "rsvp", content: null, binding: null, variant: null, url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, showMap: null, heading: "Save a place", description: "Please reply.", style: { ...emptyStyle, align: "left" } },
                  ],
                },
              ],
            },
          ],
        }),
      }),
    }) as unknown as typeof fetch;

    const prompt = "Wedding event. i have a wedding of my brother osama and nour";
    const generated = await generateOriginalSite(prompt, defaultEventConfig(prompt));

    expect(generated.message).toContain("Osama and Nour");
    expect(generated.message).toContain("full-bleed");
    expect(generated.config.title).toBe("Osama & Nour");
    expect(generated.document.nodes[0]?.label).toBe("Invitation");
    expect(generated.document.theme.texture).toBe("paper");
    expect(walkSiteNodes(generated.document).some((node) => node.type === "rsvp")).toBe(true);
  });

  it("repairs unreadable light type when the model omits a dark field", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          message: "A print-led wedding page.",
          summary: "Created an original wedding page",
          concept: "Ivory type on paper.",
          locale: "en",
          direction: "auto",
          theme: { text: "#241814", surface: "#f6efe6", accent: "#9a6a4a", muted: "#6d5a4c", display: "romantic", body: "humanist", radius: "soft", motion: "subtle", texture: "paper" },
          event: { title: "Osama & Nour", subtitle: "The wedding of Osama & Nour", eventType: "wedding", date: "Date to be announced", venueName: "Venue to be announced", venueAddress: "", rsvpDeadline: "", schedule: [{ title: "Event details", time: "Time to be announced", location: "", description: "Details to be announced." }] },
          sections: [
            {
              type: "section",
              label: "Invitation",
              style: { ...emptyStyle, color: "#f6efe6", padding: "hero", minHeight: "screen", texture: "paper", opacity: "faint" },
              rows: [
                {
                  type: "overlay",
                  label: "Names",
                  style: { ...emptyStyle },
                  blocks: [
                    { type: "text", content: "Osama\n&\nNour", binding: null, variant: "heading", url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, showMap: null, heading: null, description: null, style: { ...emptyStyle, size: "hero", opacity: "faint", letterSpacing: "widest", color: "#f6efe6" } },
                    { type: "rsvp", content: null, binding: null, variant: null, url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, showMap: null, heading: "Save a place", description: "Please reply.", style: { ...emptyStyle, align: "left" } },
                  ],
                },
              ],
            },
          ],
        }),
      }),
    }) as unknown as typeof fetch;

    const generated = await generateOriginalSite("Wedding event. osama and nour", defaultEventConfig("Wedding event. osama and nour"));
    const opening = generated.document.nodes[0];
    expect(opening?.style?.background).toBe("#241814");
    expect(opening?.style?.opacity).toBeUndefined();
    const heading = walkSiteNodes(generated.document).find((node) => node.type === "text" && node.variant === "heading");
    expect(heading?.style?.opacity).toBeUndefined();
    expect(heading?.style?.letterSpacing).toBe("tight");
  });

  it("keeps a new typography bucket instead of silently falling back to the default", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(minimalResponse({ theme: { display: "vintage", body: "warm" } })) }) }) as unknown as typeof fetch;
    const generated = await generateOriginalSite("A vintage gala", defaultEventConfig("A vintage gala"));
    expect(generated.document.theme.typography.display).toBe("vintage");
    expect(generated.document.theme.typography.body).toBe("warm");
  });

  it("keeps a model-authored quote block instead of silently falling back", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const extraBlocks = [{ type: "text", content: "A perfect evening.", binding: null, variant: "quote", url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, dividerVariant: null, showMap: null, heading: null, description: null, style: { ...emptyStyle } }];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(minimalResponse({ extraBlocks })) }) }) as unknown as typeof fetch;
    const generated = await generateOriginalSite("A garden party", defaultEventConfig("A garden party"));
    expect(walkSiteNodes(generated.document).some((node) => node.type === "text" && node.variant === "quote" && node.content === "A perfect evening.")).toBe(true);
  });

  it("keeps a model-authored ornament divider instead of silently falling back", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const extraBlocks = [{ type: "divider", content: null, binding: null, variant: null, url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, dividerVariant: "ornament", showMap: null, heading: null, description: null, style: { ...emptyStyle } }];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(minimalResponse({ extraBlocks })) }) }) as unknown as typeof fetch;
    const generated = await generateOriginalSite("A garden party", defaultEventConfig("A garden party"));
    expect(walkSiteNodes(generated.document).some((node) => node.type === "divider" && node.dividerVariant === "ornament")).toBe(true);
  });

  it("keeps a model-authored event.initials binding instead of silently falling back", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const extraBlocks = [{ type: "text", content: null, binding: "event.initials", variant: "eyebrow", url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, dividerVariant: null, showMap: null, heading: null, description: null, style: { ...emptyStyle } }];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(minimalResponse({ extraBlocks })) }) }) as unknown as typeof fetch;
    const generated = await generateOriginalSite("A garden party", defaultEventConfig("A garden party"));
    expect(walkSiteNodes(generated.document).some((node) => node.type === "text" && node.binding === "event.initials")).toBe(true);
  });

  it("keeps model-authored rotate/offset styling instead of silently falling back", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const extraBlocks = [{ type: "text", content: "Tilted", binding: null, variant: "body", url: null, alt: null, href: null, buttonLabel: null, buttonVariant: null, dividerVariant: null, showMap: null, heading: null, description: null, style: { ...emptyStyle, rotate: "left", offset: "raised" } }];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(minimalResponse({ extraBlocks })) }) }) as unknown as typeof fetch;
    const generated = await generateOriginalSite("A garden party", defaultEventConfig("A garden party"));
    const tilted = walkSiteNodes(generated.document).find((node) => node.type === "text" && node.content === "Tilted");
    expect(tilted?.style?.rotate).toBe("left");
    expect(tilted?.style?.offset).toBe("raised");
  });
});
