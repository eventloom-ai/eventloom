import { describe, expect, it } from "vitest";
import { backgroundLayers, contrastRatio, ensureSiteContrast, readableOn } from "@/lib/site-contrast";
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
});
