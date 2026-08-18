import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteDocumentRenderer } from "@/components/site-document-renderer";
import { defaultEventConfig } from "@/lib/ai/generator";
import type { SiteDocument } from "@/lib/site-document";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/rsvp-form", () => ({ RsvpForm: () => null }));

describe("site document renderer", () => {
  it("splits couple names onto whole-word lines and sizes type to the canvas", () => {
    const config = { ...defaultEventConfig("Wedding event. osama and nour"), title: "Osama & Nour" };
    const document: SiteDocument = {
      schemaVersion: 2,
      locale: "en",
      direction: "auto",
      theme: {
        colors: { text: "#f6efe6", surface: "#241814", accent: "#c2a27a", muted: "#8a7a68" },
        typography: { display: "romantic", body: "humanist" },
        radius: "soft",
        motion: "subtle",
      },
      nodes: [
        {
          id: "sec_opening",
          type: "section",
          children: [{ id: "txt_names", type: "text", binding: "event.title", variant: "heading", style: { size: "hero" } }],
        },
      ],
    };

    const html = renderToStaticMarkup(<SiteDocumentRenderer document={document} config={config} status="draft" rsvpOpen={false} />);

    expect(html).toContain("Osama");
    expect(html).toContain("Nour");
    expect(html).toContain("11cqw");
    expect(html).toContain("container-type:inline-size");
    expect(html).not.toContain("18ch");
  });

  it("honors an explicit column count on grid nodes instead of always falling back to auto-fit cards", () => {
    const config = defaultEventConfig("Wedding event");
    const baseDocument: SiteDocument = {
      schemaVersion: 2,
      locale: "en",
      direction: "auto",
      theme: {
        colors: { text: "#f6efe6", surface: "#241814", accent: "#c2a27a", muted: "#8a7a68" },
        typography: { display: "editorial", body: "clean" },
        radius: "soft",
        motion: "none",
      },
      nodes: [],
    };

    const withColumns = (columns: 1 | 2 | 3 | 4 | undefined): SiteDocument => ({
      ...baseDocument,
      nodes: [{ id: "grd_details", type: "grid", style: columns ? { columns } : undefined, children: [{ id: "txt_a", type: "text", content: "A", variant: "body" }] }],
    });

    const unset = renderToStaticMarkup(<SiteDocumentRenderer document={withColumns(undefined)} config={config} status="draft" rsvpOpen={false} />);
    expect(unset).toContain("grid-template-columns:repeat(auto-fit, minmax(min(100%, 22rem), 1fr))");

    const single = renderToStaticMarkup(<SiteDocumentRenderer document={withColumns(1)} config={config} status="draft" rsvpOpen={false} />);
    expect(single).toContain("grid-template-columns:1fr");

    const three = renderToStaticMarkup(<SiteDocumentRenderer document={withColumns(3)} config={config} status="draft" rsvpOpen={false} />);
    expect(three).toContain("grid-template-columns:repeat(auto-fit, minmax(min(100%, max(16rem, calc((100% - 2 * 1.75rem) / 3))), 1fr))");
  });

  it("wraps top-level sections in a scroll reveal unless motion is none", () => {
    const config = defaultEventConfig("Wedding event");
    const documentWithMotion = (motion: "none" | "subtle" | "expressive"): SiteDocument => ({
      schemaVersion: 2,
      locale: "en",
      direction: "auto",
      theme: {
        colors: { text: "#f6efe6", surface: "#241814", accent: "#c2a27a", muted: "#8a7a68" },
        typography: { display: "editorial", body: "clean" },
        radius: "soft",
        motion,
      },
      nodes: [{ id: "sec_a", type: "section", children: [{ id: "txt_a", type: "text", content: "Hello", variant: "body" }] }],
    });

    const none = renderToStaticMarkup(<SiteDocumentRenderer document={documentWithMotion("none")} config={config} status="draft" rsvpOpen={false} />);
    expect(none).not.toContain("opacity:0");

    const subtle = renderToStaticMarkup(<SiteDocumentRenderer document={documentWithMotion("subtle")} config={config} status="draft" rsvpOpen={false} />);
    expect(subtle).toContain("opacity:0");
    expect(subtle).toContain("translateY(14px)");

    const expressive = renderToStaticMarkup(<SiteDocumentRenderer document={documentWithMotion("expressive")} config={config} status="draft" rsvpOpen={false} />);
    expect(expressive).toContain("opacity:0");
    expect(expressive).toContain("translateY(28px)");
  });

  it("renders the new text quote variant, event.initials binding, divider variants, and rotate/offset transforms", () => {
    const config = { ...defaultEventConfig("Wedding event"), title: "Osama & Nour" };
    const baseTheme: SiteDocument["theme"] = {
      colors: { text: "#f6efe6", surface: "#241814", accent: "#c2a27a", muted: "#8a7a68" },
      typography: { display: "editorial", body: "clean" },
      radius: "soft",
      motion: "none",
    };

    const quote: SiteDocument = { schemaVersion: 2, locale: "en", direction: "auto", theme: baseTheme, nodes: [{ id: "sec_a", type: "section", children: [{ id: "txt_quote", type: "text", variant: "quote", content: "A perfect evening." }] }] };
    const quoteHtml = renderToStaticMarkup(<SiteDocumentRenderer document={quote} config={config} status="draft" rsvpOpen={false} />);
    expect(quoteHtml).toContain("<blockquote");
    expect(quoteHtml).toContain("A perfect evening.");

    const initials: SiteDocument = { schemaVersion: 2, locale: "en", direction: "auto", theme: baseTheme, nodes: [{ id: "sec_a", type: "section", children: [{ id: "txt_initials", type: "text", variant: "eyebrow", binding: "event.initials" }] }] };
    const initialsHtml = renderToStaticMarkup(<SiteDocumentRenderer document={initials} config={config} status="draft" rsvpOpen={false} />);
    expect(initialsHtml).toContain("O &amp; N");

    const ornament: SiteDocument = { schemaVersion: 2, locale: "en", direction: "auto", theme: baseTheme, nodes: [{ id: "sec_a", type: "section", children: [{ id: "div_a", type: "divider", dividerVariant: "ornament" }] }] };
    const ornamentHtml = renderToStaticMarkup(<SiteDocumentRenderer document={ornament} config={config} status="draft" rsvpOpen={false} />);
    expect(ornamentHtml).not.toContain("<hr");
    expect(ornamentHtml).toContain("◆");

    const dot: SiteDocument = { schemaVersion: 2, locale: "en", direction: "auto", theme: baseTheme, nodes: [{ id: "sec_a", type: "section", children: [{ id: "div_a", type: "divider", dividerVariant: "dot" }] }] };
    const dotHtml = renderToStaticMarkup(<SiteDocumentRenderer document={dot} config={config} status="draft" rsvpOpen={false} />);
    expect(dotHtml).not.toContain("<hr");
    expect(dotHtml.match(/border-radius:999px/g)?.length).toBe(3);

    const line: SiteDocument = { schemaVersion: 2, locale: "en", direction: "auto", theme: baseTheme, nodes: [{ id: "sec_a", type: "section", children: [{ id: "div_a", type: "divider" }] }] };
    const lineHtml = renderToStaticMarkup(<SiteDocumentRenderer document={line} config={config} status="draft" rsvpOpen={false} />);
    expect(lineHtml).toContain("<hr");

    const rotated: SiteDocument = { schemaVersion: 2, locale: "en", direction: "auto", theme: baseTheme, nodes: [{ id: "sec_a", type: "section", children: [{ id: "txt_a", type: "text", variant: "body", content: "Tilted", style: { rotate: "left", offset: "raised" } }] }] };
    const rotatedHtml = renderToStaticMarkup(<SiteDocumentRenderer document={rotated} config={config} status="draft" rsvpOpen={false} />);
    expect(rotatedHtml).toContain("transform:rotate(-2.5deg) translateY(-0.6rem)");
  });
});
