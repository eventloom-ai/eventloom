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
  italic: null, opacity: null, border: null, justify: null,
};

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
});
