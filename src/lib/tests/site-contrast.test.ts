import { describe, expect, it } from "vitest";
import { backgroundLayers, contrastRatio, ensureSiteContrast, ensureSiteLayout, readableOn } from "@/lib/site-contrast";
import type { SiteDocument } from "@/lib/site-document";

const creamDocument: SiteDocument = {
  schemaVersion: 2,
  locale: "en",
  direction: "auto",
  theme: {
    colors: { text: "#241814", surface: "#f6efe6", accent: "#9a6a4a", muted: "#6d5a4c" },
    typography: { display: "romantic", body: "humanist" },
    radius: "soft",
    motion: "subtle",
    texture: "paper",
  },
  nodes: [
    {
      id: "sec_opening",
      type: "section",
      style: { color: "#f6efe6", minHeight: "screen", padding: "hero", texture: "paper", opacity: "faint" },
      children: [
        { id: "txt_names", type: "text", binding: "event.title", variant: "heading", style: { size: "hero", opacity: "faint", letterSpacing: "widest", color: "#f6efe6" } },
      ],
    },
  ],
};

describe("site contrast", () => {
  it("keeps section color fields under paper texture instead of replacing them", () => {
    const layers = backgroundLayers("#241814", "paper", "#9a6a4a", "#f6efe6");
    expect(layers.backgroundColor).toBe("#241814");
    expect(layers.backgroundImage).toContain("radial-gradient");
  });

  it("layers a gradient behind texture instead of dropping it", () => {
    const gradient = "linear-gradient(165deg, #241814 0%, #4b5a4c 100%)";
    const layers = backgroundLayers(gradient, "paper", "#9a6a4a", "#f6efe6");
    expect(layers.backgroundColor).toBeUndefined();
    expect(layers.backgroundImage).toContain(gradient);
    expect(layers.backgroundImage?.indexOf(gradient)).toBeGreaterThan(0);
  });

  it("repairs ivory type on a cream field into a readable pair", () => {
    expect(contrastRatio("#f6efe6", "#f6efe6")).toBeLessThan(1.2);
    expect(readableOn("#f6efe6")).toBe("#1c1917");

    const document = ensureSiteContrast(creamDocument);
    const section = document.nodes[0];
    expect(section?.style?.opacity).toBeUndefined();
    expect(section?.style?.background).toBe("#241814");
    if (section && "children" in section) {
      const heading = section.children[0];
      expect(heading?.style?.opacity).toBeUndefined();
      expect(heading?.style?.letterSpacing).toBe("tight");
    }
  });

  it("opens the first section full-bleed and drops empty image blocks", () => {
    const document = ensureSiteLayout({
      ...creamDocument,
      nodes: [
        {
          id: "sec_opening",
          type: "section",
          style: { width: "narrow", minHeight: "screen", columns: 2 },
          children: [
            { id: "img_empty", type: "image", alt: "Event image" },
            { id: "txt_names", type: "text", binding: "event.title", variant: "heading", style: { size: "hero", width: "narrow" } },
          ],
        },
      ],
    });
    const section = document.nodes[0];
    expect(section?.style?.width).toBe("full");
    expect(section?.style?.columns).toBeUndefined();
    if (section && "children" in section) {
      expect(section.children.some((node) => node.type === "image")).toBe(false);
      expect(section.children[0]?.type).toBe("text");
      expect(section.children[0]?.style?.width).toBeUndefined();
    }
  });

  it("leaves rotate and offset untouched through both contrast and layout passes", () => {
    const document: SiteDocument = {
      ...creamDocument,
      nodes: [
        {
          id: "sec_opening",
          type: "section",
          style: { rotate: "left", offset: "raised" },
          children: [{ id: "txt_names", type: "text", binding: "event.title", variant: "heading", style: { rotate: "right", offset: "lowered" } }],
        },
      ],
    };

    const contrasted = ensureSiteContrast(document);
    const contrastedSection = contrasted.nodes[0];
    expect(contrastedSection?.style?.rotate).toBe("left");
    expect(contrastedSection?.style?.offset).toBe("raised");
    if (contrastedSection && "children" in contrastedSection) {
      expect(contrastedSection.children[0]?.style?.rotate).toBe("right");
      expect(contrastedSection.children[0]?.style?.offset).toBe("lowered");
    }

    const laidOut = ensureSiteLayout(document);
    const laidOutSection = laidOut.nodes[0];
    expect(laidOutSection?.style?.rotate).toBe("left");
    expect(laidOutSection?.style?.offset).toBe("raised");
    if (laidOutSection && "children" in laidOutSection) {
      expect(laidOutSection.children[0]?.style?.rotate).toBe("right");
      expect(laidOutSection.children[0]?.style?.offset).toBe("lowered");
    }
  });
});
