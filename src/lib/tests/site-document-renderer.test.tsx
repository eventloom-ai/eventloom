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
});
