import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldRenderGlobalLegalFooter } from "@/components/global-legal-footer";

describe("desktop studio layout", () => {
  it("constrains the canvas row so the AI composer stays in the viewport", () => {
    const source = readFileSync("src/components/visual-studio.tsx", "utf8");

    expect(source).toContain("grid-rows-[minmax(0,1fr)]");
    expect(source).toContain('className="relative min-h-0 min-w-0 overflow-hidden"');

    const canvasSource = readFileSync("src/components/studio-canvas.tsx", "utf8");
    expect(canvasSource).toContain('className="relative h-full min-h-0 overflow-auto');
  });

  it("keeps the shared legal footer out of the full-screen studio", () => {
    expect(shouldRenderGlobalLegalFooter("/app/events/123/studio")).toBe(false);
    expect(shouldRenderGlobalLegalFooter("/app/events/123/rsvps")).toBe(true);
    expect(shouldRenderGlobalLegalFooter("/legal")).toBe(true);
  });
});
