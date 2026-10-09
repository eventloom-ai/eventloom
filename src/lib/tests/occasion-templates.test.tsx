import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { OccasionTemplatePage } from "@/components/occasion-template-page";
import { TemplatesGalleryPage } from "@/components/templates-gallery-page";
import { extractPaletteFromPrompt, MOOD_PALETTES } from "@/lib/event-theme";
import {
  getOccasionTemplate,
  occasionMetadata,
  occasionPath,
  occasionTemplateBrief,
  occasionTemplateHref,
  occasionTemplates,
  occasionWordCount,
  sampleDesignStyle,
  sampleDesignedSite,
  sampleEventConfig,
  sampleThumbnailSite,
  templatesIndexMetadata,
} from "@/lib/occasion-templates";
import { DESIGN_STYLES } from "@/lib/event-design/styles";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { seoLandingPages } from "@/lib/seo-landing-pages";

const expectedSlugs = [
  "wedding", "engagement", "birthday", "baby-shower", "bridal-shower", "graduation", "anniversary",
  "quinceanera", "bar-bat-mitzvah", "retirement", "reunion", "corporate-event", "holiday-party", "memorial",
];
const moodWords = Object.keys(MOOD_PALETTES);

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("'", "&#x27;").replaceAll('"', "&quot;");

function jsonLdBlocks(html: string) {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap((match) => {
    const parsed = JSON.parse(match[1]) as Record<string, unknown> | Record<string, unknown>[];
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

describe("occasion template data", () => {
  it("covers every planned occasion once, with URL-safe slugs that never collide with app routes", () => {
    const slugs = occasionTemplates.map((occasion) => occasion.slug);
    expect(slugs).toEqual(expectedSlugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(isReservedSlug("templates")).toBe(true);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(isReservedSlug(slug), slug).toBe(false);
      expect(Object.keys(seoLandingPages)).not.toContain(slug);
    }
  });

  it("gives every occasion complete, unique, substantial copy", () => {
    const seen = { title: new Set<string>(), metaDescription: new Set<string>(), heading: new Set<string>(), intro: new Set<string>() };
    for (const occasion of occasionTemplates) {
      for (const key of ["name", "title", "metaDescription", "heading", "intro", "cardBlurb", "eventTypeLabel", "brief", "scheduleNote"] as const) {
        expect(occasion[key].trim(), `${occasion.slug}.${key}`).not.toBe("");
      }
      for (const key of Object.keys(seen) as (keyof typeof seen)[]) {
        expect(seen[key].has(occasion[key]), `${occasion.slug} duplicate ${key}`).toBe(false);
        seen[key].add(occasion[key]);
      }
      expect(occasion.metaDescription.length, occasion.slug).toBeLessThanOrEqual(160);
      expect(`${occasion.title} | Eventloom`.length, occasion.slug).toBeLessThanOrEqual(60);
      expect(occasion.include.length).toBeGreaterThanOrEqual(5);
      expect(occasion.schedule.length).toBeGreaterThanOrEqual(3);
      expect(occasion.rsvpQuestions.length).toBeGreaterThanOrEqual(3);
      expect(occasion.wording.length).toBeGreaterThanOrEqual(3);
      expect(occasion.faqs.length).toBeGreaterThanOrEqual(3);
      expect(occasionWordCount(occasion), occasion.slug).toBeGreaterThanOrEqual(400);
      for (const item of occasion.schedule) expect(item.time && item.title, occasion.slug).toBeTruthy();
    }
  });

  it("only states the real publishing price and never promises free publishing", () => {
    for (const occasion of occasionTemplates) {
      const faqText = occasion.faqs.map((faq) => `${faq.question} ${faq.answer}`).join(" ");
      for (const price of faqText.match(/\$\d+(?:\.\d+)?/g) ?? []) expect(price, occasion.slug).toBe("$20");
      const copy = JSON.stringify(occasion);
      expect(copy, occasion.slug).not.toMatch(/free (?:to publish|publishing|plan|trial|forever)|for free|publish(?:ing)? (?:is|for) free/i);
    }
  });

  it("links only to occasions and landing pages that exist", () => {
    for (const occasion of occasionTemplates) {
      expect(occasion.related.length).toBeGreaterThanOrEqual(2);
      expect(new Set(occasion.related).size).toBe(occasion.related.length);
      for (const slug of occasion.related) {
        expect(slug).not.toBe(occasion.slug);
        expect(getOccasionTemplate(slug), `${occasion.slug} -> ${slug}`).not.toBeNull();
      }
      for (const slug of occasion.landingPages) expect(Object.keys(seoLandingPages), `${occasion.slug} -> ${slug}`).toContain(slug);
    }
  });

  it("starts a build with a non-empty brief that selects each style's palette", () => {
    for (const occasion of occasionTemplates) {
      for (const word of moodWords) expect(occasion.brief.toLowerCase(), `${occasion.slug} brief names ${word}`).not.toContain(word);
      expect(occasion.styles.length).toBeGreaterThanOrEqual(2);
      expect(occasion.styles.length).toBeLessThanOrEqual(3);
      expect(new Set(occasion.styles.map((style) => style.mood)).size).toBe(occasion.styles.length);
      for (const style of occasion.styles) {
        const brief = occasionTemplateBrief(occasion, style.mood);
        expect(brief.length).toBeGreaterThan(80);
        expect(brief.length).toBeLessThanOrEqual(2_000);
        expect(brief.startsWith(occasion.eventTypeLabel)).toBe(true);
        expect(extractPaletteFromPrompt(brief)).toEqual(MOOD_PALETTES[style.mood]);
        const href = occasionTemplateHref(occasion, style.mood);
        expect(href.startsWith("/app/events/new?brief=")).toBe(true);
        expect(new URL(href, "https://eventloom.co").searchParams.get("brief")).toBe(brief);
      }
      expect(occasionTemplateHref(occasion)).toBe(occasionTemplateHref(occasion, occasion.styles[0].mood));
    }
  });

  it("lays out a deterministic designed sample for every style, each style on a page looking different", () => {
    for (const occasion of occasionTemplates) {
      const seen = new Set<string>();
      occasion.styles.forEach((style, index) => {
        const config = sampleEventConfig(occasion, index);
        expect(config.theme.colors).toEqual(MOOD_PALETTES[style.mood]);
        const design = sampleDesignedSite(occasion, index);
        const { styleKey, paletteKey } = sampleDesignStyle(occasion, index);
        expect(design.styleKey).toBe(styleKey);
        expect(DESIGN_STYLES[styleKey].palettes.map((palette) => palette.key), `${occasion.slug}/${style.mood}`).toContain(paletteKey);
        expect(design.sections.filter((section) => section.kind === "rsvp")).toHaveLength(1);
        expect(design.sections[0].kind).toBe("hero");
        expect(sampleDesignedSite(occasion, index)).toEqual(design);
        expect(sampleThumbnailSite(design).sections.map((section) => section.kind)).toEqual(["hero", "details"]);
        seen.add(`${styleKey}/${paletteKey}`);
      });
      expect(seen.size, occasion.slug).toBe(occasion.styles.length);
    }
    // Formal and corporate templates showcase the matching styles; a memorial is never playful.
    expect(sampleDesignStyle(getOccasionTemplate("wedding")!, 1).styleKey).toBe("noir");
    expect(sampleDesignStyle(getOccasionTemplate("corporate-event")!, 0).styleKey).toBe("minimal");
    expect(sampleDesignStyle(getOccasionTemplate("birthday")!, 0).styleKey).toBe("playful");
    getOccasionTemplate("memorial")!.styles.forEach((_, index) => expect(sampleDesignStyle(getOccasionTemplate("memorial")!, index).styleKey).not.toBe("playful"));
  });

  it("sets a canonical URL and social metadata per page, and lists every page in the sitemap", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(templatesIndexMetadata().alternates?.canonical).toBe("/templates");
    expect(urls).toContain("/templates");
    for (const occasion of occasionTemplates) {
      const metadata = occasionMetadata(occasion);
      expect(metadata.alternates?.canonical).toBe(occasionPath(occasion.slug));
      expect(metadata.openGraph?.url).toBe(occasionPath(occasion.slug));
      expect(metadata.description).toBe(occasion.metaDescription);
      expect(urls).toContain(occasionPath(occasion.slug));
    }
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("template pages", () => {
  it("renders an occasion page with a read-only preview, a build CTA, and matching FAQ schema", () => {
    const occasion = getOccasionTemplate("baby-shower")!;
    const html = renderToStaticMarkup(<OccasionTemplatePage occasion={occasion} />);

    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain(occasion.heading);
    expect(html).toContain(occasion.sample.title);
    expect(html).toContain("Sample form. Guests can reply once the event is published.");
    expect(html).not.toContain("<form");
    // The sample renders through the designed section library, in the style picked for this template.
    expect(html).toContain(`data-event-style="${sampleDesignStyle(occasion, 0).styleKey}"`);
    expect(html).not.toContain("eventloom-site-document");
    expect(html).toContain(`href="${escapeHtml(occasionTemplateHref(occasion))}"`);
    for (const related of occasion.related) expect(html).toContain(`href="${occasionPath(related)}"`);

    const blocks = jsonLdBlocks(html);
    const faq = blocks.find((block) => block["@type"] === "FAQPage") as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity.map((entity) => entity.name)).toEqual(occasion.faqs.map((item) => item.question));
    for (const item of occasion.faqs) expect(html).toContain(escapeHtml(item.question));
    expect(blocks.some((block) => block["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("renders the gallery with a card and thumbnail for every occasion", () => {
    const html = renderToStaticMarkup(<TemplatesGalleryPage />);
    for (const occasion of occasionTemplates) {
      expect(html).toContain(`href="${occasionPath(occasion.slug)}"`);
      expect(html).toContain(escapeHtml(occasion.cardBlurb));
    }
    const list = jsonLdBlocks(html).find((block) => block["@type"] === "ItemList") as { itemListElement: unknown[] };
    expect(list.itemListElement).toHaveLength(occasionTemplates.length);
    expect(html).not.toContain("<main class=\"eventloom-site-document\"");
    expect(html.match(/data-event-style="/g)).toHaveLength(occasionTemplates.length);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    // Thumbnails sit inside the card links: no nested <a> (a hydration error and invalid HTML).
    for (const card of html.split("<li>").slice(1).map((chunk) => chunk.split("</li>")[0])) expect(card.match(/<a /g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
});
