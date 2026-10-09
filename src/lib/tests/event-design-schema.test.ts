import { describe, expect, it } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { designEventSite, designSiteFromConfig } from "@/lib/event-design/design-event-site";
import { eventDesignSchema, readEventDesign, type EventDesign } from "@/lib/event-design/schema";
import type { EventConfig } from "@/lib/types";

const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
const base: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "sage", content: wedding.content };
const kinds = (config: EventConfig, design: EventDesign) => designEventSite(config, design.styleKey, design.content, { paletteKey: design.paletteKey, sections: design.sections }).sections.map((section) => section.kind);

describe("event design schema", () => {
  it("accepts a complete design and every sample's content", () => {
    expect(eventDesignSchema.safeParse(base).success).toBe(true);
    for (const sample of DESIGN_SAMPLES) {
      expect(eventDesignSchema.safeParse({ version: 1, styleKey: "editorial", paletteKey: "newsprint", content: sample.content }).success, sample.key).toBe(true);
    }
    expect(eventDesignSchema.safeParse({ ...base, sections: { order: ["story", "details"], hidden: ["gallery"], variants: { hero: "cover", rsvp: "split" }, tones: { story: "inverse" } } }).success).toBe(true);
  });

  it("rejects anything outside the closed sets", () => {
    const invalid: unknown[] = [
      { ...base, version: 2 },
      { ...base, styleKey: "brutalist" },
      { ...base, paletteKey: "gilded" }, // a noir palette on a romantic design
      { ...base, sections: { hidden: ["hero"] } },
      { ...base, sections: { hidden: ["rsvp"] } },
      { ...base, sections: { variants: { hero: "carousel" } } },
      { ...base, sections: { variants: { travel: "cards" } } },
      { ...base, sections: { tones: { hero: "neon" } } },
      { ...base, sections: { order: ["story", "story"] } },
      { ...base, content: { ...base.content, travel: { items: [{ title: "Hotel", body: "Near the venue.", href: "http://example.com" }] } } },
      { ...base, content: { ...base.content, colors: ["#ff0000"] } },
      { ...base, fontSize: "huge" },
    ];
    for (const value of invalid) expect(eventDesignSchema.safeParse(value).success, JSON.stringify(value).slice(0, 120)).toBe(false);
  });

  it("reads a design only when it is valid, so legacy and broken configs keep the old renderer", () => {
    expect(readEventDesign({ design: base })).toEqual(base);
    expect(readEventDesign({})).toBeNull();
    expect(readEventDesign(null)).toBeNull();
    expect(readEventDesign({ design: { ...base, styleKey: "nope" } as unknown as EventDesign })).toBeNull();
    expect(designSiteFromConfig(wedding.config)).toBeNull();
    expect(designSiteFromConfig({ ...wedding.config, design: base })?.styleKey).toBe("romantic");
  });
});

describe("designEventSite section overrides", () => {
  it("hides optional sections but never the hero or the RSVP", () => {
    const shown = kinds(wedding.config, base);
    expect(shown).toEqual(["hero", "details", "story", "schedule", "gallery", "goodToKnow", "travel", "rsvp", "closing"]);
    const hidden = kinds(wedding.config, { ...base, sections: { hidden: ["story", "travel", "closing"] } });
    expect(hidden).toEqual(["hero", "details", "schedule", "gallery", "goodToKnow", "rsvp"]);
    // Defense in depth: even an unvalidated override can't remove the hero or RSVP.
    const forced = designEventSite(wedding.config, "romantic", base.content, { sections: { hidden: ["hero", "rsvp"] } as never });
    expect(forced.sections.map((section) => section.kind)).toEqual(expect.arrayContaining(["hero", "rsvp"]));
  });

  it("reorders everything after the hero, keeping unlisted sections in their default order and the closing last", () => {
    expect(kinds(wedding.config, { ...base, sections: { order: ["rsvp", "details"] } })).toEqual(["hero", "rsvp", "details", "story", "schedule", "gallery", "goodToKnow", "travel", "closing"]);
    expect(kinds(wedding.config, { ...base, sections: { order: ["hero", "schedule", "story"] } })[0]).toBe("hero");
    expect(kinds(wedding.config, { ...base, sections: { order: ["closing", "story"] } }).slice(0, 3)).toEqual(["hero", "closing", "story"]);
  });

  it("swaps variants within each section's set and keeps picked tones", () => {
    const site = designEventSite(wedding.config, "romantic", base.content, { paletteKey: "sage", sections: { variants: { hero: "cover", schedule: "agenda" }, tones: { story: "inverse", details: "base" } } });
    const byKind = Object.fromEntries(site.sections.map((section) => [section.kind, section]));
    expect(byKind.hero.variant).toBe("cover");
    expect(byKind.schedule.variant).toBe("agenda");
    expect(byKind.story.tone).toBe("inverse");
    expect(byKind.details.tone).toBe("base");
    expect(site.paletteKey).toBe("sage");
  });

  it("never prints a placeholder RSVP deadline", () => {
    const site = designEventSite({ ...wedding.config, rsvpDeadline: "To be announced" }, "playful");
    const rsvp = site.sections.find((section) => section.kind === "rsvp")!.props as { deadline?: string; reminder: { label: string }[] };
    expect(rsvp.deadline).toBeUndefined();
    expect(rsvp.reminder.map((item) => item.label)).not.toContain("Reply by");
  });

  it("uses the stored heading copy when there is some", () => {
    const site = designEventSite(wedding.config, "editorial", { detailsHeading: "The essentials", scheduleHeading: "How the day unfolds", goodToKnowHeading: "Notes", dressCode: { body: "Garden formal" }, goodToKnow: [{ title: "Parking", body: "On site." }] });
    const heading = (kind: string) => (site.sections.find((section) => section.kind === kind)?.props as { heading: string }).heading;
    expect(heading("details")).toBe("The essentials");
    expect(heading("schedule")).toBe("How the day unfolds");
    expect(heading("goodToKnow")).toBe("Notes");
  });
});
