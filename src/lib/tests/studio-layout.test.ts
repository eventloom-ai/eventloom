import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldRenderGlobalLegalFooter } from "@/components/global-legal-footer";

describe("desktop studio layout", () => {
  it("keeps the Puck canvas and AI conversation inside the viewport", () => {
    const source = readFileSync("src/components/visual-studio.tsx", "utf8");

    expect(source).toContain('className="relative flex min-h-0 flex-1"');
    expect(source).toContain('className="min-w-0 flex-1 bg-[#f3f3f3]"');
    expect(source).toContain("<Puck");
    expect(source).toContain("<StudioChat");
  });

  it("keeps the shared legal footer out of the full-screen studio", () => {
    expect(shouldRenderGlobalLegalFooter("/app/events/123/studio")).toBe(false);
    expect(shouldRenderGlobalLegalFooter("/app/events/123/rsvps")).toBe(true);
    expect(shouldRenderGlobalLegalFooter("/legal")).toBe(true);
  });
});
