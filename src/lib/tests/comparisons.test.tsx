import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GET as llmsTxt } from "@/app/llms.txt/route";
import sitemap from "@/app/sitemap";
import { CompareHubPage } from "@/components/compare-hub-page";
import { ComparisonPage } from "@/components/comparison-page";
import { LandingPage } from "@/components/landing-page";
import { RsvpBuildersGuidePage } from "@/components/rsvp-builders-guide-page";
import {
  COMPARE_PATH,
  compareHubCopy,
  comparePath,
  comparisonLinksFor,
  comparisonRowLabels,
  competitorMetadata,
  competitors,
  eventloomColumn,
  formatCheckedDate,
  formatCheckedMonth,
  getCompetitor,
  GUIDE_PATH,
  guideCopy,
  guideItems,
  guideMetadata,
} from "@/lib/comparisons";
import { getOccasionTemplate } from "@/lib/occasion-templates";
import { isReservedSlug, RESERVED_SLUGS } from "@/lib/reserved-slugs";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const expectedSlugs = ["zola", "the-knot", "joy", "partiful", "evite", "paperless-post", "rsvpify"];
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("'", "&#x27;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const sentences = (text: string) => text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);

function jsonLdBlocks(html: string) {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap((match) => {
    const parsed = JSON.parse(match[1]) as Record<string, unknown> | Record<string, unknown>[];
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

function onOwnDomain(url: string, domains: readonly string[]) {
  const { protocol, hostname } = new URL(url);
  return protocol === "https:" && domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

describe("competitor comparison data", () => {
  it("covers every planned competitor once, with unique URL-safe slugs", () => {
    const slugs = competitors.map((competitor) => competitor.slug);
    expect(slugs).toEqual(expectedSlugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(getCompetitor(slug)?.slug).toBe(slug);
    }
    expect(getCompetitor("nope")).toBeNull();
  });

  it("gives every competitor an answer-first verdict, a table, both sides of the choice, and FAQs", () => {
    for (const competitor of competitors) {
      const count = sentences(competitor.verdict).length;
      expect(count, `${competitor.slug} verdict sentences`).toBeGreaterThanOrEqual(2);
      expect(count, `${competitor.slug} verdict sentences`).toBeLessThanOrEqual(3);
      expect(competitor.verdict).toContain(competitor.name);
      expect(competitor.verdict).toContain("Eventloom");
      expect(competitor.rows.length, competitor.slug).toBeGreaterThanOrEqual(8);
      expect(new Set(competitor.rows.map((row) => row.key)).size, `${competitor.slug} duplicate rows`).toBe(competitor.rows.length);
      for (const row of competitor.rows) {
        expect(comparisonRowLabels[row.key]).toBeTruthy();
        expect(row.competitor.trim(), `${competitor.slug}.${row.key}`).not.toBe("");
      }
      expect(competitor.rows.map((row) => row.key)).toContain("pricing");
      expect(competitor.chooseEventloom.length).toBeGreaterThanOrEqual(3);
      expect(competitor.chooseCompetitor.length).toBeGreaterThanOrEqual(3);
      expect(competitor.faqs.length).toBeGreaterThanOrEqual(3);
      for (const key of ["pricing", "bestFor", "watchOut"] as const) expect(competitor.guide[key].trim()).not.toBe("");
    }
  });

  it("sources every competitor on its own domain, with a valid checked date", () => {
    for (const competitor of competitors) {
      expect(competitor.sources.length, competitor.slug).toBeGreaterThanOrEqual(1);
      expect(onOwnDomain(competitor.homepage, competitor.domains), competitor.homepage).toBe(true);
      expect(new Set(competitor.sources.map((source) => source.url)).size, `${competitor.slug} duplicate sources`).toBe(competitor.sources.length);
      for (const source of competitor.sources) {
        expect(onOwnDomain(source.url, competitor.domains), `${competitor.slug}: ${source.url}`).toBe(true);
        expect(source.label.trim()).not.toBe("");
      }
      expect(competitor.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const checked = new Date(`${competitor.checkedAt}T00:00:00Z`);
      expect(Number.isNaN(checked.getTime())).toBe(false);
      expect(checked.toISOString().slice(0, 10)).toBe(competitor.checkedAt);
    }
    expect(formatCheckedDate("2026-10-08")).toBe("October 8, 2026");
    expect(formatCheckedMonth("2026-10-08")).toBe("October 2026");
  });

  it("states Eventloom's real price and trade-offs, and never advertises custom domains", () => {
    // Only the lines that describe Eventloom itself (competitor rows may truthfully say "free plan").
    const eventloomCopy = JSON.stringify([eventloomColumn, compareHubCopy.does, guideCopy.eventloomEntry, guideCopy.useCases.map((item) => item.eventloom), competitors.map((item) => item.chooseEventloom)]);
    expect(eventloomColumn.pricing).toContain("$20");
    for (const priceText of JSON.stringify(eventloomColumn).match(/\$\d+(?:\.\d+)?/g) ?? []) expect(priceText).toBe("$20");
    expect(JSON.stringify(eventloomColumn)).not.toMatch(/custom domain/i);
    expect(JSON.stringify([compareHubCopy, guideCopy])).not.toMatch(/custom domain/i);
    expect(eventloomCopy).not.toMatch(/free (?:to publish|publishing|plan|trial|forever)|publish(?:ing)? (?:is|for) free/i);
    for (const missing of ["registry", "paper", "app", "check-in"]) expect(compareHubCopy.doesNot.join(" ").toLowerCase()).toContain(missing);
  });

  it("keeps titles and descriptions within search snippet limits", () => {
    for (const competitor of competitors) {
      expect(competitor.title.startsWith(`Eventloom vs ${competitor.name}: `), competitor.title).toBe(true);
      expect(competitor.title.length, competitor.slug).toBeLessThanOrEqual(70);
      expect(competitor.metaDescription.length, competitor.slug).toBeLessThanOrEqual(160);
      const metadata = competitorMetadata(competitor);
      expect(metadata.alternates?.canonical).toBe(comparePath(competitor.slug));
      expect(metadata.title).toEqual({ absolute: competitor.title });
    }
    expect(compareHubCopy.metaDescription.length).toBeLessThanOrEqual(160);
    expect(guideCopy.metaDescription.length).toBeLessThanOrEqual(160);
    expect(guideMetadata().alternates?.canonical).toBe(GUIDE_PATH);
  });

  it("links only to occasions and competitors that exist", () => {
    for (const competitor of competitors) {
      for (const slug of competitor.relatedOccasions) expect(getOccasionTemplate(slug), `${competitor.slug} -> ${slug}`).not.toBeNull();
    }
    for (const useCase of guideCopy.useCases) {
      for (const pick of useCase.picks) expect(getCompetitor(pick.slug), `${useCase.id} -> ${pick.slug}`).not.toBeNull();
    }
    const wedding = comparisonLinksFor("wedding").map((link) => link.href);
    expect(wedding).toEqual([comparePath("zola"), comparePath("the-knot"), comparePath("joy"), GUIDE_PATH]);
    expect(comparisonLinksFor("other")).toEqual([{ href: GUIDE_PATH, label: "Best RSVP website builders" }]);
  });

  it("reserves the new top-level routes so no event can take them", () => {
    for (const slug of ["compare", "guides"]) {
      expect(RESERVED_SLUGS.has(slug), slug).toBe(true);
      expect(isReservedSlug(slug)).toBe(true);
    }
  });

  it("lists every page in the sitemap and in llms.txt", async () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    const llms = await llmsTxt().text();
    const startHere = llms.slice(llms.indexOf("## Start here"), llms.indexOf("## Templates by occasion"));
    for (const path of [COMPARE_PATH, GUIDE_PATH, ...competitors.map((competitor) => comparePath(competitor.slug))]) {
      expect(urls, path).toContain(path);
      expect(startHere, path).toContain(`${path})`);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("comparison pages", () => {
  it("render the verdict first, the full table, sources, and FAQ schema matching the visible FAQ", () => {
    for (const competitor of competitors) {
      const html = renderToStaticMarkup(<ComparisonPage competitor={competitor} />);
      expect(html).toContain(`Eventloom vs ${escapeHtml(competitor.name)}</h1>`);
      const verdictAt = html.indexOf(escapeHtml(competitor.verdict));
      expect(verdictAt, competitor.slug).toBeGreaterThan(-1);
      expect(verdictAt).toBeLessThan(html.indexOf("<table"));
      for (const row of competitor.rows) {
        expect(html).toContain(escapeHtml(comparisonRowLabels[row.key]));
        expect(html).toContain(escapeHtml(eventloomColumn[row.key]));
        expect(html).toContain(escapeHtml(row.competitor));
      }
      expect(html).toContain("Choose Eventloom if…");
      expect(html).toContain(`Choose ${escapeHtml(competitor.name)} if…`);
      expect(html).toContain("Sources, checked <time");
      expect(html).toContain(formatCheckedMonth(competitor.checkedAt));
      for (const source of competitor.sources) expect(html).toContain(`href="${escapeHtml(source.url)}"`);

      const blocks = jsonLdBlocks(html);
      const faq = blocks.find((block) => block["@type"] === "FAQPage") as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
      expect(faq.mainEntity.map((entity) => entity.name)).toEqual(competitor.faqs.map((item) => item.question));
      for (const item of competitor.faqs) expect(html).toContain(escapeHtml(item.answer));
      expect(blocks.some((block) => block["@type"] === "BreadcrumbList")).toBe(true);
    }
  });

  it("renders the hub with every comparison and an ItemList", () => {
    const html = renderToStaticMarkup(<CompareHubPage />);
    for (const competitor of competitors) expect(html).toContain(`href="${comparePath(competitor.slug)}"`);
    expect(html).toContain(`href="${GUIDE_PATH}"`);
    const list = jsonLdBlocks(html).find((block) => block["@type"] === "ItemList") as { itemListElement: unknown[] };
    expect(list.itemListElement).toHaveLength(competitors.length);
  });

  it("renders the guide answer-first with ItemList and FAQPage schema and a dated source list", () => {
    const html = renderToStaticMarkup(<RsvpBuildersGuidePage />);
    expect(html.indexOf(escapeHtml(guideCopy.summary))).toBeGreaterThan(-1);
    expect(html.indexOf(escapeHtml(guideCopy.summary))).toBeLessThan(html.indexOf('id="weddings"'));
    for (const useCase of guideCopy.useCases) expect(html).toContain(`id="${useCase.id}"`);
    const blocks = jsonLdBlocks(html);
    const list = blocks.find((block) => block["@type"] === "ItemList") as { itemListElement: { name: string }[] };
    expect(list.itemListElement.map((item) => item.name)).toEqual(guideItems().map((item) => item.name));
    expect(list.itemListElement.map((item) => item.name)).toEqual([...competitors.map((competitor) => competitor.name), "Eventloom"]);
    const faq = blocks.find((block) => block["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
    expect(faq.mainEntity.map((entity) => entity.name)).toEqual(guideCopy.faqs.map((item) => item.question));
    expect(html).toContain("Sources, checked <time");
    expect(html).toContain("Eventloom publishes this guide");
  });

  it("is linked from the homepage use cases section", () => {
    const html = renderToStaticMarkup(<LandingPage authConfigured signupEnabled />);
    const useCases = html.slice(html.indexOf('id="use-cases"'));
    expect(useCases).toContain(`href="${COMPARE_PATH}"`);
    expect(useCases).toContain(`href="${GUIDE_PATH}"`);
  });
});
