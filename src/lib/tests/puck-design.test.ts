import type { ComponentData, Data } from "@puckeditor/core";
import { describe, expect, it } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { designEventSite } from "@/lib/event-design/design-event-site";
import type { EventDesign } from "@/lib/event-design/schema";
import { STYLE_KEYS } from "@/lib/event-design/styles";
import { designToPuckData, puckDataToDesign, puckDesignDataToEventPatch, sectionKindFromPuckId } from "@/lib/puck-design";

const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
const config = wedding.config;
const base: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "blush", content: wedding.content };

const types = (data: Data) => data.content.map((component) => component.type);
const root = (data: Data) => (data.root as { props: Record<string, unknown> }).props;
const withContent = (data: Data, content: ComponentData[]): Data => ({ ...data, content });
const withRoot = (data: Data, props: Record<string, unknown>): Data => ({ ...data, root: { props: { ...root(data), ...props } } } as Data);
const component = (data: Data, type: string) => data.content.find((item) => item.type === type)!;
const editProps = (data: Data, type: string, props: Record<string, unknown>) => withContent(data, data.content.map((item) => item.type === type ? { ...item, props: { ...item.props, ...props } } : item));

describe("designed studio data", () => {
  it("round-trips every style, sample and override combination without loss", () => {
    const overrides: EventDesign["sections"][] = [
      undefined,
      { hidden: ["travel"] },
      { order: ["story", "details", "schedule"] },
      { variants: { hero: "cover", schedule: "agenda" }, tones: { story: "inverse" } },
      { order: ["rsvp", "details"], hidden: ["gallery", "closing"], variants: { details: "ticket" }, tones: { details: "alt" } },
    ];
    for (const sample of DESIGN_SAMPLES) {
      for (const styleKey of STYLE_KEYS) {
        for (const sections of overrides) {
          const design: EventDesign = { version: 1, styleKey, paletteKey: designEventSite(sample.config, styleKey).paletteKey, content: sample.content, ...(sections ? { sections } : {}) };
          const data = designToPuckData(sample.config, design);
          expect(puckDataToDesign(data, design, sample.config), `${sample.key}/${styleKey}/${JSON.stringify(sections)}`).toEqual(design);
        }
      }
    }
  });

  it("puts one component per rendered section, in page order, with the style, palette and event details on the root", () => {
    const data = designToPuckData(config, base);
    expect(types(data)).toEqual(["Hero", "Details", "Story", "Schedule", "Gallery", "GoodToKnow", "Travel", "Rsvp", "Closing"]);
    expect(root(data)).toMatchObject({ styleKey: "romantic", paletteKey: "blush", eventTitle: config.title, eventDate: config.date, venueName: config.venueName });
    expect(component(data, "Story").props).toMatchObject({ id: "section-story", variant: "", tone: "", heading: wedding.content.story!.heading });
    expect(sectionKindFromPuckId("section-goodToKnow")).toBe("goodToKnow");
    expect(sectionKindFromPuckId("Text-123")).toBeNull();
    expect(puckDesignDataToEventPatch(withRoot(data, { eventTitle: "Amina & Kareem’s wedding" }))).toMatchObject({ title: "Amina & Kareem’s wedding" });
  });

  it("saves text edits, and an emptied field falls back to the style's copy", () => {
    let data = designToPuckData(config, base);
    data = editProps(data, "Rsvp", { heading: "Will you be there?", description: "" });
    data = editProps(data, "Hero", { eyebrow: "Save the date" });
    const design = puckDataToDesign(data, base, config);
    expect(design.content.rsvpHeading).toBe("Will you be there?");
    expect(design.content.rsvpDescription).toBeUndefined();
    expect(design.content.eyebrow).toBe("Save the date");
    expect(design.content.story).toEqual(base.content.story);
  });

  it("hides a removed section, keeps its copy, and shows it again when re-added", () => {
    const data = designToPuckData(config, base);
    const removed = puckDataToDesign(withContent(data, data.content.filter((item) => item.type !== "Story")), base, config);
    expect(removed.sections?.hidden).toEqual(["story"]);
    expect(removed.content.story).toEqual(base.content.story);
    const again = designToPuckData(config, removed);
    expect(types(again)).not.toContain("Story");
    const readded = puckDataToDesign(withContent(again, [...again.content.slice(0, 2), { type: "Story", props: { id: "Story-new", variant: "", tone: "", heading: "", paragraphs: "" } }, ...again.content.slice(2)]), removed, config);
    expect(readded.sections?.hidden).toBeUndefined();
  });

  it("stores the canvas order and per-section layout and background choices", () => {
    const data = designToPuckData(config, base);
    const [hero, ...rest] = data.content;
    const rsvp = rest.find((item) => item.type === "Rsvp")!;
    const moved = withContent(data, [hero, rsvp, ...rest.filter((item) => item !== rsvp)]);
    const design = puckDataToDesign(editProps(moved, "Schedule", { variant: "agenda", tone: "inverse" }), base, config);
    expect(design.sections?.order?.slice(0, 2)).toEqual(["rsvp", "details"]);
    expect(design.sections?.variants).toEqual({ schedule: "agenda" });
    expect(design.sections?.tones).toEqual({ schedule: "inverse" });
    const site = designEventSite(config, design.styleKey, design.content, { paletteKey: design.paletteKey, sections: design.sections });
    expect(site.sections.map((section) => section.kind).slice(0, 3)).toEqual(["hero", "rsvp", "details"]);
  });

  it("switching style maps the palette into the new style and resets layout and background overrides", () => {
    const styled: EventDesign = { ...base, sections: { variants: { hero: "cover" }, tones: { story: "inverse" }, hidden: ["travel"] } };
    const data = designToPuckData(config, styled);
    const design = puckDataToDesign(withRoot(data, { styleKey: "playful", paletteKey: "blush" }), styled, config);
    expect(design.styleKey).toBe("playful");
    expect(design.paletteKey).toBe("sherbet"); // the pink palette of the new style
    expect(design.sections).toEqual({ hidden: ["travel"] });
    // A palette of the current style is taken as is; one from another style is mapped.
    expect(puckDataToDesign(withRoot(data, { paletteKey: "sage" }), styled, config).paletteKey).toBe("sage");
    expect(puckDataToDesign(withRoot(data, { paletteKey: "gilded" }), styled, config).paletteKey).toBe("blush");
  });

  it("ignores duplicate or unknown components and invalid travel links", () => {
    const data = designToPuckData(config, base);
    const noisy = withContent(data, [...data.content, { type: "Story", props: { id: "dupe", heading: "Ignored", paragraphs: "Ignored" } }, { type: "Text", props: { id: "legacy" } }]);
    expect(puckDataToDesign(noisy, base, config)).toEqual(base);
    const travel = editProps(data, "Travel", { items: [{ title: "Hotel", body: "Close by.", href: "javascript:alert(1)", linkLabel: "Go" }] });
    expect(puckDataToDesign(travel, base, config).content.travel?.items).toEqual([{ title: "Hotel", body: "Close by." }]);
  });
});
