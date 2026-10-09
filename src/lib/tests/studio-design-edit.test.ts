import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { applyDesignPatch, fallbackDesignPatch, sectionsTouchedBy } from "@/lib/event-design/design-patch";
import { SECTION_KEYS, type EventDesign } from "@/lib/event-design/schema";
import { composeSiteDocument } from "@/lib/site-document";
import type { EventConfig } from "@/lib/types";

const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
const design: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "blush", content: wedding.content, sections: { variants: { hero: "cover" }, tones: { story: "inverse" } } };

const mocks = vi.hoisted(() => ({
  key: "sk-test",
  config: null as unknown as EventConfig,
  events: [] as Array<{ type: string; payload: Record<string, unknown> }>,
  refund: vi.fn(async () => true),
  commit: vi.fn(),
  output: null as unknown,
}));

vi.mock("@/lib/env", () => ({
  AI_REQUEST_TIMEOUT_MS: 240_000,
  env: { openaiApiKey: () => mocks.key },
  openaiResponsesOptions: () => ({ model: "test" }),
}));
vi.mock("@/lib/payments/billing", () => ({ refundBuildCredit: mocks.refund }));
vi.mock("@/lib/agent/generate-document", () => ({ generateOriginalSite: vi.fn() }));
vi.mock("@/lib/studio-store", () => ({
  loadStudioState: async () => ({ revision: { id: "version-1", config: mocks.config, document: composeSiteDocument(mocks.config, "", (prefix) => `${prefix}_node`) }, messages: [] }),
  getStudioRun: async () => ({ kind: "edit", cancel_requested: false }),
  appendRunEvent: async (_jobId: string, _eventId: string, type: string, payload: Record<string, unknown>) => { mocks.events.push({ type, payload }); return true; },
  commitStudioRevision: mocks.commit,
  createBuilderMessage: async () => null,
  updateStudioRun: async () => undefined,
}));

import { executeStudioRun, normalizeDesignEdit } from "@/lib/studio-agent";

describe("design patches", () => {
  it("switches style, mapping the palette and dropping the old style's layout overrides", () => {
    const next = applyDesignPatch(design, { styleKey: "noir" });
    expect(next).toMatchObject({ styleKey: "noir", paletteKey: "gilded", content: design.content });
    expect(next.sections).toBeUndefined();
    expect(applyDesignPatch(design, { styleKey: "noir", paletteKey: "emerald" }).paletteKey).toBe("emerald");
    expect(applyDesignPatch(design, { paletteKey: "sage" })).toMatchObject({ styleKey: "romantic", paletteKey: "sage", sections: design.sections });
    // A palette of another style is ignored rather than breaking the design.
    expect(applyDesignPatch(design, { paletteKey: "cobalt" }).paletteKey).toBe("blush");
  });

  it("edits and clears copy, and shows, hides, reorders and re-lays out sections", () => {
    const next = applyDesignPatch(design, {
      content: { rsvpHeading: "Join us?", closingLine: "Until then." },
      clearContent: ["travel", "eyebrow"],
      hide: ["gallery", "rsvp", "hero"],
      order: ["hero", "rsvp", "details"],
      variants: { hero: null, schedule: "agenda", details: "not-a-variant" },
    });
    expect(next.content).toMatchObject({ rsvpHeading: "Join us?", closingLine: "Until then." });
    expect(next.content.travel).toBeUndefined();
    expect(next.content.eyebrow).toBeUndefined();
    expect(next.sections).toEqual({ order: ["rsvp", "details"], hidden: ["gallery"], variants: { schedule: "agenda" }, tones: { story: "inverse" } });
    expect(applyDesignPatch(next, { show: ["gallery"] }).sections?.hidden).toBeUndefined();
    expect(sectionsTouchedBy({ content: { rsvpHeading: "x" }, hide: ["gallery"], variants: { hero: null } })).toEqual(["hero", "gallery", "rsvp"]);
  });

  it("rejects patches outside the closed sets", () => {
    expect(() => applyDesignPatch(design, { styleKey: "vaporwave" })).toThrow();
    expect(() => applyDesignPatch(design, { content: { colors: "#f00" } })).toThrow();
    expect(() => applyDesignPatch(design, { content: { travel: { items: [{ title: "A", body: "B", href: "http://x.test" }] } } })).toThrow();
  });

  it("reads plain requests without a provider", () => {
    expect(fallbackDesignPatch("Make it playful", design).patch).toEqual({ styleKey: "playful" });
    expect(fallbackDesignPatch("Use the sage palette", design).patch).toEqual({ paletteKey: "sage" });
    expect(fallbackDesignPatch("Please hide the travel section", design).patch).toEqual({ hide: ["travel"] });
    expect(fallbackDesignPatch("Bring back the story", design).patch).toEqual({ show: ["story"] });
    expect(fallbackDesignPatch("Hide the RSVP", design).patch).toEqual({});
    expect(fallbackDesignPatch("Can you make it nicer?", design)).toMatchObject({ patch: {}, summary: "No design change" });
  });

  it("drops model copy with numbers the host never gave, and links they never pasted", () => {
    const variants = Object.fromEntries(SECTION_KEYS.map((key) => [key, null]));
    const edit = normalizeDesignEdit({
      message: "Done",
      summary: "Updated copy",
      eventPatch: { title: null, subtitle: null, date: null, venueName: null, venueAddress: null, rsvpDeadline: null, schedule: null, rsvpFields: null },
      design: {
        styleKey: null, paletteKey: "sage",
        content: { eyebrow: null, detailsHeading: null, scheduleHeading: null, galleryHeading: null, goodToKnowHeading: null, rsvpHeading: "Reply by June 3", rsvpDescription: "We would love to know.", closingLine: null, dressCode: null, story: null, goodToKnow: null, travel: [{ title: "The Inn", body: "Rooms nearby.", href: "https://inn.example", linkLabel: "Book" }] },
        clearContent: [], hide: ["gallery"], show: [], order: null, variants: { ...variants, schedule: "agenda" },
      },
    }, "Add a hotel note about The Inn");
    expect(edit.designPatch).toEqual({ paletteKey: "sage", content: { rsvpDescription: "We would love to know.", travel: { items: [{ title: "The Inn", body: "Rooms nearby." }] } }, hide: ["gallery"], variants: { schedule: "agenda" } });
    expect(edit.eventPatch).toEqual({});
  });
});

describe("studio assistant runs on designed events", () => {
  const originalFetch = global.fetch;
  afterAll(() => { global.fetch = originalFetch; });
  beforeEach(() => {
    mocks.key = "sk-test";
    mocks.config = { ...wedding.config, design };
    mocks.events = [];
    mocks.refund.mockClear();
    mocks.commit.mockReset();
    mocks.commit.mockResolvedValue({ ok: true, revision: { id: "version-2" } });
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ id: "resp-1", output_text: JSON.stringify(mocks.output) }) })) as unknown as typeof fetch;
  });

  const run = (prompt = "Switch to the noir style and call the RSVP 'Kindly reply'") => executeStudioRun({ jobId: "job-1", eventId: "event-1", ownerId: "owner-1", prompt, selectedNodeIds: ["section-rsvp"] });

  it("commits a design patch and keeps the legacy document untouched", async () => {
    mocks.output = {
      message: "Switched to Luxe Noir.",
      summary: "Switched style",
      eventPatch: { title: null, subtitle: null, date: null, venueName: null, venueAddress: null, rsvpDeadline: null, schedule: null, rsvpFields: null },
      design: {
        styleKey: "noir", paletteKey: null,
        content: { eyebrow: null, detailsHeading: null, scheduleHeading: null, galleryHeading: null, goodToKnowHeading: null, rsvpHeading: "Kindly reply", rsvpDescription: null, closingLine: null, dressCode: null, story: null, goodToKnow: null, travel: null },
        clearContent: [], hide: [], show: [], order: null, variants: Object.fromEntries(SECTION_KEYS.map((key) => [key, null])),
      },
    };
    await run();
    const request = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
    expect(request.text.format.name).toBe("eventloom_design_edit");
    expect(JSON.parse(request.input[1].content).selectedSections).toEqual(["rsvp"]);
    const committed = mocks.commit.mock.calls[0][0];
    expect(committed.config.design).toMatchObject({ styleKey: "noir", paletteKey: "gilded", content: { rsvpHeading: "Kindly reply" } });
    expect(committed.config.title).toBe(wedding.config.title);
    expect(committed.document).toEqual(composeSiteDocument(mocks.config, "", (prefix) => `${prefix}_node`));
    const patch = mocks.events.find((event) => event.type === "patch")!;
    expect(patch.payload.changedNodeIds).toEqual(["section-rsvp"]);
    expect(mocks.events.at(-1)?.type).toBe("committed");
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it("falls back to the deterministic reading when the provider fails, and keeps the credit", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => null })) as unknown as typeof fetch;
    await run("Use the sage palette");
    expect(mocks.commit.mock.calls[0][0].config.design).toMatchObject({ styleKey: "romantic", paletteKey: "sage" });
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it("refunds when no provider was called and the run fails", async () => {
    mocks.key = "";
    mocks.commit.mockResolvedValue({ ok: false, error: "version_conflict" });
    await run("Use the sage palette");
    expect(mocks.events.at(-1)).toEqual({ type: "error", payload: { message: "version_conflict" } });
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", "event-1", "job-1");
  });
});
