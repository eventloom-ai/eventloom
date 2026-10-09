import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventOgCard } from "@/lib/og/event-og-card";
import type { EventRecord } from "@/lib/types";

const lookups = vi.hoisted(() => ({ bySlug: vi.fn(), byHost: vi.fn() }));
vi.mock("@/lib/public-event", () => ({ loadEventBySlug: lookups.bySlug, loadEventByHost: lookups.byHost }));

import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import * as slugImage from "@/app/[slug]/opengraph-image";
import * as hostImage from "@/app/sites/[host]/opengraph-image";
import TemplateImage from "@/app/templates/[occasion]/opengraph-image";
import type { EventDesign } from "@/lib/event-design/schema";
import { eventOgCard, GENERIC_OG_IMAGE_ID, ogImageAlt, ogImageId, venueCity } from "@/lib/og/event-og-card";
import { googleFontCssUrl, loadOgFonts, OG_STYLE_FONTS } from "@/lib/og/og-fonts";
import { renderOgImage } from "@/lib/og/render-og-image";
import { getOccasionTemplate, occasionOgCard, occasionTemplates } from "@/lib/occasion-templates";

// The generic card's short cache header tells it apart from an event card in route responses.
const GENERIC_CACHE = "public, max-age=300, s-maxage=300";
const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
const design: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "sage", content: wedding.content };
const event = (overrides: Partial<EventRecord> = {}, config: Partial<EventRecord["config"]> = {}): EventRecord => ({
  id: "event-1",
  slug: "amina-kareem",
  status: "published",
  rsvp_open: true,
  config: { ...wedding.config, design, ...config },
  ...overrides,
});

// Every test runs offline: a font fetch must fall back to the bundled font, never reach the network.
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  lookups.bySlug.mockReset();
  lookups.byHost.mockReset();
});

describe("event share card", () => {
  it("is drawn only for published events; drafts, archived and missing events get the generic card", () => {
    expect(eventOgCard(null)).toBeNull();
    expect(eventOgCard(undefined)).toBeNull();
    expect(eventOgCard(event({ status: "draft" }))).toBeNull();
    expect(eventOgCard(event({ status: "archived" }))).toBeNull();
    expect(ogImageId(null)).toBe(GENERIC_OG_IMAGE_ID);
    expect(ogImageAlt(null)).toMatch(/Eventloom/);
  });

  it("uses the design's style and hero palette, couple names, date and venue city, and nothing private", () => {
    const card = eventOgCard(event())!;
    expect(card.styleKey).toBe("romantic");
    expect(card.coupleNames).toEqual(["Amina", "Kareem"]);
    expect(card.details).toEqual(["Saturday, September 19, 2026", "Hudson, NY"]);
    expect(card.colors.bg).toBe("#f5f4ee");
    const drawn = JSON.stringify(card);
    for (const hidden of ["214 Orchard Hill Road", "August 1, 2026", "12534", "amina-kareem", "event-1"]) expect(drawn).not.toContain(hidden);
    expect(ogImageAlt(card)).toBe("Amina & Kareem · Saturday, September 19, 2026 · Hudson, NY");
  });

  it("reduces a venue address to its city and never shows the street or unit", () => {
    expect(venueCity("214 Orchard Hill Road, Hudson, NY 12534")).toBe("Hudson, NY");
    expect(venueCity("214 Orchard Road, Hudson Valley")).toBe("Hudson Valley");
    expect(venueCity("312 Mercer Street, Apartment 4B")).toBe("");
    expect(venueCity("10 Downing Street, London SW1A 2AA, United Kingdom")).toBe("London");
    expect(venueCity("Brooklyn")).toBe("Brooklyn");
    expect(venueCity("41 Riverside Drive, upstairs")).toBe("");
    expect(venueCity("Address to be announced")).toBe("");
    // No city in the address: the venue's name (already the page's headline detail) stands in.
    expect(eventOgCard(event({}, { venueAddress: "312 Mercer Street, Apartment 4B" }))?.details[1]).toBe("Willowbrook Farm Estate");
  });

  it("leaves placeholder details off and keeps a single-line title for non-couple events", () => {
    const card = eventOgCard(event({}, { title: "Maya Turns 30 🎉", eventType: "birthday", date: "Date to be announced", venueName: "Venue to be announced", venueAddress: "" }))!;
    expect(card.coupleNames).toBeNull();
    expect(card.title).toBe("Maya Turns 30");
    expect(card.details).toEqual([]);
  });

  it("gives legacy events (no design) a card in the style a new event of that kind would get", () => {
    const legacy = event({}, { design: undefined, eventType: "birthday", title: "Sam's 40th", theme: { mood: "sunset", colors: [], fontPairing: "" } });
    expect(eventOgCard(legacy)?.styleKey).toBe("playful");
  });

  it("falls back to the generic card for scripts the card's fonts cannot draw", () => {
    expect(eventOgCard(event({}, { title: "حفل زفاف أحمد وسارة", eventType: "wedding" }))).toBeNull();
    expect(eventOgCard(event({}, { title: "Zoë & Jürgen" }))?.coupleNames).toEqual(["Zoë", "Jürgen"]);
  });

  it("changes its image id whenever a published version changes what the card draws", () => {
    const first = ogImageId(eventOgCard(event()));
    expect(first).toMatch(/^v\d+-[a-z0-9]+$/);
    expect(ogImageId(eventOgCard(event()))).toBe(first);
    expect(ogImageId(eventOgCard(event({}, { date: "Sunday, September 20, 2026" })))).not.toBe(first);
    expect(ogImageId(eventOgCard(event({}, { design: { ...design, paletteKey: "blush" } })))).not.toBe(first);
  });
});

describe("guest page opengraph-image routes", () => {
  it("serves the generic image id and image for a missing or draft event on /[slug]", async () => {
    for (const found of [null, event({ status: "draft" }), event({ status: "archived" })]) {
      lookups.bySlug.mockResolvedValue(found);
      const [meta] = await slugImage.generateImageMetadata({ params: { slug: "amina-kareem" } });
      expect(meta.id).toBe(GENERIC_OG_IMAGE_ID);
      expect(meta.size).toEqual({ width: 1200, height: 630 });
      // Even with the published card's id in the URL, a draft never draws its details.
      for (const id of [GENERIC_OG_IMAGE_ID, ogImageId(eventOgCard(event()))]) {
        const response = await slugImage.default({ params: Promise.resolve({ slug: "amina-kareem" }), id: Promise.resolve(id) });
        expect(response.headers.get("content-type")).toBe("image/png");
        expect(response.headers.get("cache-control")).toBe(GENERIC_CACHE);
      }
    }
  });

  it("serves a versioned, cacheable card for a published event on /[slug]", async () => {
    lookups.bySlug.mockResolvedValue(event());
    const [meta] = await slugImage.generateImageMetadata({ params: { slug: "amina-kareem" } });
    expect(meta.id).toBe(ogImageId(eventOgCard(event())));
    expect(meta.alt).toContain("Amina & Kareem");
    const response = await slugImage.default({ params: Promise.resolve({ slug: "amina-kareem" }), id: Promise.resolve(meta.id) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=86400");
    const png = new Uint8Array(await response.arrayBuffer());
    expect([...png.slice(1, 4)].map((code) => String.fromCharCode(code)).join("")).toBe("PNG");
    // An old (or guessed) id never pins a card: it gets the generic image.
    for (const id of [GENERIC_OG_IMAGE_ID, "v1-old"]) {
      const stale = await slugImage.default({ params: Promise.resolve({ slug: "amina-kareem" }), id: Promise.resolve(id) });
      expect(stale.headers.get("cache-control"), id).toBe(GENERIC_CACHE);
    }
  });

  it("does the same for custom domains and subdomains on /sites/[host]", async () => {
    lookups.byHost.mockResolvedValue(event({ status: "draft" }));
    expect((await hostImage.generateImageMetadata({ params: { host: "amina.example.com" } }))[0].id).toBe(GENERIC_OG_IMAGE_ID);
    lookups.byHost.mockResolvedValue(event());
    expect((await hostImage.generateImageMetadata({ params: { host: "Amina.Example.com" } }))[0].id).toBe(ogImageId(eventOgCard(event())));
    expect(lookups.byHost).toHaveBeenLastCalledWith("amina.example.com");
    lookups.byHost.mockResolvedValue(null);
    const response = await hostImage.default({ params: Promise.resolve({ host: "%E0" }), id: Promise.resolve(GENERIC_OG_IMAGE_ID) });
    expect(response.headers.get("cache-control")).toBe(GENERIC_CACHE);
    lookups.byHost.mockResolvedValue(event());
    const card = await hostImage.default({ params: Promise.resolve({ host: "amina.example.com" }), id: Promise.resolve(ogImageId(eventOgCard(event()))) });
    expect(card.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=86400");
  });
});

describe("template share cards", () => {
  it("draws every template's first sample, labelled as a template", async () => {
    for (const occasion of occasionTemplates) {
      const card = occasionOgCard(occasion);
      expect(card, occasion.slug).not.toBeNull();
      expect(card?.eyebrow).toBe(`${occasion.name} template`);
    }
    const response = await TemplateImage({ params: Promise.resolve({ occasion: getOccasionTemplate("wedding")!.slug }) });
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});

describe("share card fonts", () => {
  it("asks Google Fonts for just the card's characters in the style's faces", () => {
    const url = new URL(googleFontCssUrl(OG_STYLE_FONTS.noir.display, "Gala"));
    expect(url.origin).toBe("https://fonts.googleapis.com");
    expect(url.searchParams.get("family")).toBe("Bodoni Moda:ital,wght@1,400");
    expect(url.searchParams.get("text")).toBe("Gal");
  });

  it("uses no custom fonts (the bundled default) when Google Fonts is unreachable", async () => {
    expect(await loadOgFonts("editorial", "Title", "LABEL")).toBeUndefined();
    const card: EventOgCard = { ...eventOgCard(event())!, styleKey: "editorial" };
    expect((await renderOgImage(card)).status).toBe(200);
  });
});
