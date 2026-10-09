import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { EventSite } from "@/components/event-sections/event-site";
import { parseEventDate } from "@/lib/event-design/date";
import { designEventSite } from "@/lib/event-design/design-event-site";
import { DESIGN_STYLES, STYLE_KEYS, TONES } from "@/lib/event-design/styles";
import type { DesignedSection, EventSiteDesign } from "@/lib/event-design/types";
import { contrastRatio } from "@/lib/site-contrast";
import type { EventConfig } from "@/lib/types";

vi.mock("next/image", () => ({ default: ({ src }: { src: string }) => <i data-photo={src} /> }));

const bare: EventConfig = {
  title: "Launch Night",
  subtitle: "Drinks and demos.",
  eventType: "party",
  date: "Summer 2026",
  venueName: "To be announced",
  schedule: [],
  rsvpFields: ["name", "attendance"],
  theme: { mood: "", colors: [], fontPairing: "" },
};

const section = <K extends DesignedSection["kind"]>(design: EventSiteDesign, kind: K) =>
  design.sections.find((item): item is Extract<DesignedSection, { kind: K }> => item.kind === kind);

describe("designEventSite", () => {
  it("gives every style a hero, details and an RSVP block, hero first and closing last", () => {
    for (const style of STYLE_KEYS) {
      for (const config of [bare, ...DESIGN_SAMPLES.map((sample) => sample.config)]) {
        const kinds = designEventSite(config, style).sections.map((item) => item.kind);
        expect(kinds, style).toEqual(expect.arrayContaining(["hero", "details", "rsvp"]));
        expect(kinds[0]).toBe("hero");
        expect(kinds.at(-1)).toBe("closing");
        expect(kinds.filter((kind) => kind === "rsvp")).toHaveLength(1);
      }
    }
  });

  it("always carries the date and, when known, the time into the hero, details and RSVP reminder", () => {
    for (const style of STYLE_KEYS) {
      for (const sample of DESIGN_SAMPLES) {
        const design = designEventSite(sample.config, style, sample.content);
        const hero = section(design, "hero")!;
        const details = section(design, "details")!;
        expect(hero.props.date.dateLabel.length).toBeGreaterThan(0);
        expect(details.props.date.time, `${style}/${sample.key}`).toMatch(/\d:\d\d [AP]M/);
        expect(section(design, "rsvp")!.props.reminder.map((item) => item.label)).toEqual(expect.arrayContaining(["Date", "Place"]));
        const html = renderToStaticMarkup(<EventSite design={design} rsvp={<form />} />);
        expect(html).toContain(details.props.date.time);
        expect(html).toContain(hero.props.date.day ?? hero.props.date.dateLabel);
      }
    }
    // An unparseable date is still shown verbatim.
    const fallback = section(designEventSite(bare, "minimal"), "details")!;
    expect(fallback.props.date.dateLabel).toBe("Summer 2026");
    expect(renderToStaticMarkup(<EventSite design={designEventSite(bare, "minimal")} rsvp={null} />)).toContain("Summer 2026");
  });

  it("uses no image sections and renders no photo when the event has none", () => {
    const birthday = DESIGN_SAMPLES.find((sample) => sample.key === "birthday")!;
    for (const style of STYLE_KEYS) {
      const design = designEventSite(birthday.config, style, birthday.content);
      expect(design.sections.some((item) => item.kind === "gallery")).toBe(false);
      const hero = section(design, "hero")!;
      expect(hero.props.image).toBeUndefined();
      expect(["typeset", "monogram", "poster"]).toContain(hero.variant);
      expect(renderToStaticMarkup(<EventSite design={design} rsvp={null} />)).not.toContain("data-photo");
    }
  });

  it("uses the photos it is given, and only safe URLs", () => {
    const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
    const unsafe = { ...wedding.config, galleryImageUrls: ["javascript:alert(1)", "http://insecure.example/a.jpg", ...(wedding.config.galleryImageUrls ?? [])] };
    for (const style of STYLE_KEYS) {
      const design = designEventSite(unsafe, style, wedding.content);
      expect(section(design, "hero")!.props.image?.url).toBe(wedding.config.heroImageUrl);
      const gallery = section(design, "gallery")!;
      expect(gallery.props.images.every((image) => image.url.startsWith("https://"))).toBe(true);
    }
  });

  it("leaves optional sections out when there is no copy for them", () => {
    const kinds = designEventSite(bare, "editorial").sections.map((item) => item.kind);
    expect(kinds).toEqual(["hero", "details", "rsvp", "closing"]);
    expect(section(designEventSite(bare, "editorial"), "details")!.props.mapUrl).toBeUndefined();
  });

  it("keeps neighbouring sections visually separated", () => {
    for (const style of STYLE_KEYS) {
      for (const sample of DESIGN_SAMPLES) {
        const sections = designEventSite(sample.config, style, sample.content).sections;
        sections.slice(1).forEach((current, index) => {
          const previous = sections[index];
          const coverAbove = previous.kind === "hero" && previous.variant === "cover";
          if (current.tone === previous.tone && !coverAbove) expect(current.ruled, `${style}/${sample.key}/${current.kind}`).toBe(true);
        });
      }
    }
  });

  it("sizes couple, short and long titles so they fit a phone", () => {
    const hero = (title: string, eventType = "party") => section(designEventSite({ ...bare, title, eventType }, "romantic"), "hero")!.props;
    expect(hero("Amina & Kareem", "wedding").coupleNames).toEqual(["Amina", "Kareem"]);
    expect(hero("Amina & Kareem", "wedding").titleScale).toBe("xl");
    expect(hero("Rock and Roll Night").coupleNames).toBeNull();
    expect(hero("Northwind Product Offsite 2026").titleScale).toBe("md");
    expect(hero("Maya Turns 30").numeral).toBe("30");
  });

  it("marks right-to-left content", () => {
    expect(designEventSite({ ...bare, title: "خطوبة ليلى وعمر" }, "romantic").direction).toBe("rtl");
    expect(designEventSite(bare, "romantic").direction).toBe("ltr");
  });
});

describe("design styles", () => {
  it("keep every text color at WCAG AA on its background and cards", () => {
    for (const style of Object.values(DESIGN_STYLES)) {
      expect(style.palettes.length).toBeGreaterThanOrEqual(2);
      for (const palette of style.palettes) {
        expect(contrastRatio(palette.accent, palette.onAccent), `${style.key}/${palette.key} button`).toBeGreaterThanOrEqual(4.5);
        for (const tone of TONES) {
          const colors = palette.tones[tone];
          for (const text of [colors.ink, colors.muted, colors.accentText]) {
            for (const surface of [colors.bg, colors.card]) expect(contrastRatio(text, surface), `${style.key}/${palette.key}/${tone} ${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  it("only use fonts loaded by the root layout", () => {
    for (const style of Object.values(DESIGN_STYLES)) {
      for (const face of Object.values(style.fonts)) expect(face).toMatch(/^var\(--font-(?:instrument-serif|newsreader|work-sans|fraunces|space-grotesk|inter|bricolage-grotesque|outfit|bodoni-moda|ibm-plex-sans)\)$/);
    }
  });

  it("pick a palette from the event mood", () => {
    expect(designEventSite({ ...bare, theme: { ...bare.theme, mood: "sage garden" } }, "romantic").paletteKey).toBe("sage");
    expect(designEventSite(bare, "romantic", {}, { paletteKey: "sage" }).paletteKey).toBe("sage");
    expect(designEventSite(bare, "noir").paletteKey).toBe("gilded");
  });
});

describe("parseEventDate", () => {
  it("splits common date wordings into parts", () => {
    expect(parseEventDate("Saturday, September 19, 2026 · 4:30 PM")).toMatchObject({ weekday: "Saturday", month: "September", day: "19", year: "2026", time: "4:30 PM", dateLabel: "Saturday, September 19, 2026" });
    expect(parseEventDate("19 September 2026 at 7pm")).toMatchObject({ month: "September", day: "19", time: "7 PM", dateLabel: "19 September 2026" });
    expect(parseEventDate("Wednesday, May 20 – Friday, May 22, 2026")).toMatchObject({ month: "May", day: "20–22", year: "2026", weekday: undefined });
    expect(parseEventDate("Summer 2026")).toMatchObject({ dateLabel: "Summer 2026", day: undefined, time: undefined });
    expect(parseEventDate("")).toMatchObject({ raw: "Date to be announced" });
  });

  it("falls back to the first timed schedule item", () => {
    expect(parseEventDate("June 12, 2027", [{ title: "Doors", time: "Fri · 6:30 pm" }]).time).toBe("6:30 PM");
  });
});
