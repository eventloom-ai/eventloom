import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../app");
const layout = readFileSync(path.join(root, "layout.tsx"), "utf8");
const css = readFileSync(path.join(root, "globals.css"), "utf8");
const fonts = [...layout.matchAll(/^const (\w+) = \w+\(\{(.*)\}\);$/gm)].map(([, name, options]) => ({ name, variable: /variable: "([^"]+)"/.exec(options)?.[1], preload: !/preload: false/.test(options) }));

describe("global font loading", () => {
  it("preloads only the faces every page renders", () => {
    expect(fonts.filter((font) => font.preload).map((font) => font.variable).sort()).toEqual(["--font-inter-face", "--font-outfit-face", "--font-playfair-face"]);
    expect(fonts).toHaveLength(13);
  });

  it("still defines every face variable the theme CSS reads, on <html>", () => {
    const used = new Set([...css.matchAll(/var\((--font-[a-z-]+-face)\)/g)].map(([, name]) => name));
    expect(used.size).toBe(13);
    for (const variable of used) {
      const font = fonts.find((item) => item.variable === variable);
      expect(font, variable).toBeDefined();
      expect(layout).toContain(`\${${font!.name}.variable}`);
    }
  });
});
