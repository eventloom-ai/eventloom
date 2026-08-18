import { describe, expect, it } from "vitest";
import { normalizeModelEdit } from "@/lib/studio-agent";

describe("normalizeModelEdit", () => {
  it("passes through a rotate/offset style patch", () => {
    const edit = normalizeModelEdit({
      message: "Tilted the caption.",
      summary: "Tilted the caption",
      operations: [{ op: "update_style", nodeId: "txt_a", style: { rotate: "left", offset: "raised" } }],
    });
    expect(edit.operations).toEqual([{ op: "update_style", nodeId: "txt_a", style: { rotate: "left", offset: "raised" } }]);
  });

  it("passes through a new typography.display theme value", () => {
    const edit = normalizeModelEdit({
      message: "Switched to a vintage look.",
      summary: "Switched to a vintage look",
      operations: [{ op: "set_theme", theme: { display: "vintage", body: "warm" } }],
    });
    expect(edit.operations).toEqual([{ op: "set_theme", display: "vintage", body: "warm" }]);
  });
});
