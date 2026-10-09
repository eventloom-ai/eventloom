import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ key: "" }));
vi.mock("@/lib/env", () => ({
  AI_REQUEST_TIMEOUT_MS: 240_000,
  env: { openaiApiKey: () => mocks.key },
  openaiResponsesOptions: () => ({ model: "test", reasoning: { effort: "high" } }),
}));

import { artDirectEvent, dressCodeFromBrief, fallbackDesignContent, fallbackEventDesign } from "@/lib/agent/art-director";
import { eventDesignSchema, SECTION_KEYS } from "@/lib/event-design/schema";
import { DESIGN_MOODS, MOOD_PALETTE, STYLE_FOR_KIND, chooseDesignStyle, designKind, detectMood, type DesignKind } from "@/lib/event-design/style-choice";
import { DESIGN_STYLES, STYLE_KEYS } from "@/lib/event-design/styles";
import type { EventConfig } from "@/lib/types";

const config = (overrides: Partial<EventConfig> = {}): EventConfig => ({
  title: "Lena & Omar",
  subtitle: "Join us for a garden supper.",
  eventType: "wedding",
  date: "Saturday, June 12, 2027 at 4:00 PM",
  venueName: "Rose Court",
  schedule: [{ title: "Ceremony", time: "4:00 PM" }],
  rsvpFields: ["name", "attendance"],
  theme: { mood: "custom editorial", colors: [], fontPairing: "" },
  ...overrides,
});

const KIND_EXAMPLES: Record<DesignKind, string> = {
  wedding: "wedding",
  shower: "baby shower",
  birthday: "birthday party",
  kids: "kids birthday party",
  corporate: "corporate offsite",
  formal: "black-tie gala",
  memorial: "memorial service",
  other: "dinner",
};

describe("deterministic style mapping", () => {
  it("maps every kind of event and every intake mood to a style and one of that style's palettes", () => {
    for (const kind of Object.keys(STYLE_FOR_KIND) as DesignKind[]) {
      for (const mood of [null, ...DESIGN_MOODS]) {
        const choice = chooseDesignStyle({ eventType: KIND_EXAMPLES[kind], mood });
        expect(choice.kind, KIND_EXAMPLES[kind]).toBe(kind);
        expect(STYLE_KEYS).toContain(choice.styleKey);
        expect(DESIGN_STYLES[choice.styleKey].palettes.map((palette) => palette.key), `${kind}/${mood}`).toContain(choice.paletteKey);
      }
    }
    for (const style of STYLE_KEYS) for (const mood of DESIGN_MOODS) expect(DESIGN_STYLES[style].palettes.map((palette) => palette.key)).toContain(MOOD_PALETTE[style][mood]);
  });

  it("follows the approved direction per kind of event", () => {
    for (const mood of [null, "blush", "lavender", "forest", "navy", "sunset"] as const) {
      expect(["romantic", "editorial"], `wedding/${mood}`).toContain(chooseDesignStyle({ eventType: "wedding", mood }).styleKey);
      expect(["romantic", "editorial"], `engagement/${mood}`).toContain(chooseDesignStyle({ eventType: "engagement party", mood }).styleKey);
    }
    expect(chooseDesignStyle({ eventType: "birthday" }).styleKey).toBe("playful");
    expect(chooseDesignStyle({ eventType: "event", prompt: "Maya turns 7! A kids party with a bouncy castle" }).styleKey).toBe("playful");
    for (const mood of DESIGN_MOODS) expect(chooseDesignStyle({ eventType: "kids party", mood }).styleKey).toBe("playful");
    expect(chooseDesignStyle({ eventType: "corporate offsite" }).styleKey).toBe("minimal");
    expect(chooseDesignStyle({ eventType: "product launch", mood: "sunset" })).toMatchObject({ styleKey: "minimal", paletteKey: "signal" });
    for (const eventType of ["gala", "black-tie dinner", "awards night", "New Year's Eve party"]) expect(chooseDesignStyle({ eventType }).styleKey, eventType).toBe("noir");
    expect(chooseDesignStyle({ eventType: "wedding", prompt: "A black-tie wedding at the Plaza" }).styleKey).toBe("noir");
    for (const mood of DESIGN_MOODS) expect(chooseDesignStyle({ eventType: "memorial", mood }).styleKey).not.toBe("playful");
  });

  it("maps each intake mood to a palette that matches it", () => {
    expect(chooseDesignStyle({ eventType: "wedding", mood: "blush" })).toMatchObject({ styleKey: "romantic", paletteKey: "blush" });
    expect(chooseDesignStyle({ eventType: "wedding", mood: "forest" })).toMatchObject({ styleKey: "romantic", paletteKey: "sage" });
    expect(chooseDesignStyle({ eventType: "wedding", mood: "navy" })).toMatchObject({ styleKey: "editorial", paletteKey: "riviera" });
    expect(chooseDesignStyle({ eventType: "wedding", mood: "gold" })).toMatchObject({ styleKey: "noir", paletteKey: "gilded" });
    expect(chooseDesignStyle({ eventType: "gala", mood: "forest" })).toMatchObject({ styleKey: "noir", paletteKey: "emerald" });
    expect(chooseDesignStyle({ eventType: "birthday", mood: "sunset" })).toMatchObject({ styleKey: "playful", paletteKey: "sherbet" });
    expect(chooseDesignStyle({ eventType: "birthday", mood: "lavender" })).toMatchObject({ styleKey: "playful", paletteKey: "sherbet" });
    expect(chooseDesignStyle({ eventType: "corporate", mood: "navy" })).toMatchObject({ styleKey: "minimal", paletteKey: "cobalt" });
  });

  it("reads the mood from the intake chip, then the config, then the brief", () => {
    expect(detectMood("A wedding", "navy", "blush")).toBe("navy");
    expect(detectMood("A wedding", undefined, "Forest")).toBe("forest");
    expect(detectMood("A wedding. Use the gold color palette.")).toBe("gold");
    expect(detectMood("A wedding with goldfish")).toBeNull();
    expect(designKind("event", "A celebration of life for Grandpa Joe")).toBe("memorial");
  });
});

describe("fallback content never invents facts", () => {
  it("adds only a dress code the host stated, and no story, notes, travel or policies", () => {
    expect(fallbackDesignContent("A garden wedding for Lena and Omar on June 12 at Rose Court.")).toEqual({});
    expect(fallbackDesignContent("Dress code: garden formal. Lena and Omar's wedding.")).toEqual({ dressCode: { body: "Garden formal" } });
    expect(fallbackDesignContent("A black-tie gala for the museum.")).toEqual({ dressCode: { body: "Black tie" } });
    expect(dressCodeFromBrief("We need a site for my party")).toBeUndefined();
  });

  it("builds a valid design for every kind and mood from the event alone", () => {
    for (const kind of Object.keys(KIND_EXAMPLES) as DesignKind[]) {
      for (const mood of [null, ...DESIGN_MOODS]) {
        const design = fallbackEventDesign({ config: config({ eventType: KIND_EXAMPLES[kind] }), prompt: "Details in the brief.", mood });
        expect(eventDesignSchema.safeParse(design).success).toBe(true);
        expect(design.content).toEqual({});
        expect(design.sections).toBeUndefined();
      }
    }
  });
});

describe("art director provider step", () => {
  const originalFetch = global.fetch;
  const respond = (body: unknown) => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify(body) }) })) as unknown as typeof fetch;
  };
  const modelOutput = (overrides: Record<string, unknown> = {}) => ({
    styleKey: "editorial",
    paletteKey: "riviera",
    content: {
      eyebrow: "The wedding of",
      detailsHeading: null,
      scheduleHeading: "The day",
      story: { eyebrow: null, heading: "How we met", paragraphs: ["Lena and Omar met at Rose Court during a summer supper."], signature: "Lena & Omar" },
      dressCode: "Garden formal",
      goodToKnowHeading: null,
      goodToKnow: [{ title: "Adults only", body: "Please leave the little ones at home." }, { title: "Parking", body: "Free parking behind Rose Court." }],
      travel: [{ title: "Hotel Marlow", body: "Rooms held until May 1.", href: "https://hotel.example/marlow", linkLabel: "Book" }],
      galleryHeading: null,
      rsvpHeading: "Kindly reply",
      rsvpDescription: "Please reply by May 15.",
      closingLine: "See you in the garden.",
    },
    sections: { hidden: [], variants: Object.fromEntries(SECTION_KEYS.map((key) => [key, null])) },
    ...overrides,
  });

  beforeEach(() => { mocks.key = "sk-test"; });
  afterEach(() => { global.fetch = originalFetch; });

  it("falls back without a key or without time, never calling the provider", async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    mocks.key = "";
    expect((await artDirectEvent({ prompt: "A wedding", config: config() })).generated).toBe(false);
    mocks.key = "sk-test";
    expect((await artDirectEvent({ prompt: "A wedding", config: config(), deadline: Date.now() + 1_000 })).generated).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("falls back on a provider error or unusable output", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => null })) as unknown as typeof fetch;
    const failed = await artDirectEvent({ prompt: "A birthday", config: config({ eventType: "birthday" }), mood: "sunset" });
    expect(failed).toMatchObject({ generated: false, design: { styleKey: "playful", paletteKey: "sherbet" } });
    respond({ styleKey: "vaporwave" });
    expect((await artDirectEvent({ prompt: "A birthday", config: config({ eventType: "birthday" }) })).generated).toBe(false);
  });

  it("keeps the chosen style, fixes the palette to the host's mood, and sends a structured, low-effort request", async () => {
    respond(modelOutput());
    const result = await artDirectEvent({ prompt: "Lena and Omar's wedding at Rose Court. Dress code: garden formal.", config: config(), mood: "forest", deadline: Date.now() + 200_000 });
    expect(result.generated).toBe(true);
    expect(result.design).toMatchObject({ styleKey: "editorial", paletteKey: "newsprint" });
    const request = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
    expect(request.reasoning).toEqual({ effort: "low" });
    expect(request.text.format).toMatchObject({ type: "json_schema", strict: true });
    expect(JSON.parse(request.input[1].content)).toMatchObject({ hostMood: "forest", hasPhotos: false });
  });

  it("drops copy the brief does not support: invented policies, travel, links, dates and dress codes", async () => {
    respond(modelOutput());
    const { design } = await artDirectEvent({ prompt: "Lena and Omar's wedding at Rose Court on June 12.", config: config() });
    expect(design.content.eyebrow).toBe("The wedding of");
    expect(design.content.dressCode).toBeUndefined();
    expect(design.content.goodToKnow).toBeUndefined();
    expect(design.content.travel).toBeUndefined();
    expect(design.content.rsvpDescription).toBeUndefined(); // "May 15" is not in the brief
    // Naming the couple and the venue is not a story: "met during a summer supper" was invented.
    expect(design.content.story).toBeUndefined();
  });

  it("keeps a story, notes and travel the host gave, but links only to URLs they pasted", async () => {
    respond(modelOutput());
    const prompt = "Wedding for Lena and Omar at Rose Court. They met during a summer supper there. Adults only, sorry little ones. Free parking behind the venue. We have rooms at Hotel Marlow until May 1. Dress code: garden formal.";
    const { design } = await artDirectEvent({ prompt, config: config() });
    expect(design.content.dressCode).toEqual({ body: "Garden formal" });
    expect(design.content.goodToKnow?.map((item) => item.title)).toEqual(["Adults only", "Parking"]);
    expect(design.content.travel?.items).toEqual([{ title: "Hotel Marlow", body: "Rooms held until May 1." }]);
    expect(design.content.story).toMatchObject({ heading: "How we met", signature: "Lena & Omar" });
  });

  it("guards variants, hidden sections and style choices", async () => {
    respond(modelOutput({ styleKey: "playful", sections: { hidden: ["details", "story"], variants: { ...Object.fromEntries(SECTION_KEYS.map((key) => [key, null])), hero: "typeset", schedule: "agenda" } } }));
    const memorial = await artDirectEvent({ prompt: "A memorial for Grandma Rose", config: config({ eventType: "memorial service", heroImageUrl: "/api/assets/11111111-1111-4111-8111-111111111111" }) });
    expect(memorial.design.styleKey).not.toBe("playful");
    expect(memorial.design.sections?.hidden).toEqual(["story"]);
    // A photo leads the page: no photo-less hero when there is a photo.
    expect(memorial.design.sections?.variants).toEqual({ schedule: "agenda" });
  });
});
