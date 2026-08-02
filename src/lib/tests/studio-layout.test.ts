import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("desktop studio layout", () => {
  it("constrains the canvas row so the AI composer stays in the viewport", () => {
    const source = readFileSync("src/components/visual-studio.tsx", "utf8");

    expect(source).toContain("grid-rows-[minmax(0,1fr)]");
    expect(source).toContain('className="relative min-h-0 min-w-0 overflow-hidden"');
  });
});
