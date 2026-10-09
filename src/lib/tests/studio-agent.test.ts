import { describe, expect, it } from "vitest";
import { normalizeModelEdit } from "@/lib/studio-agent";
import { applySiteOperations } from "@/lib/site-document-operations";
import { composeSiteDocument, findSiteNode, walkSiteNodes } from "@/lib/site-document";
import { demoEvents } from "@/lib/sample-data";

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

  it("defaults an empty schedule time instead of producing a value that fails validation later, and drops titleless rows", () => {
    const edit = normalizeModelEdit({
      message: "Updated the schedule.",
      summary: "Updated the schedule",
      operations: [],
      eventPatch: {
        schedule: [
          { title: "Brunch", time: "11:00 AM" },
          { title: "Getting There", time: "" },
          { title: "", time: "9:00 PM" },
        ],
      },
    });
    expect(edit.eventPatch.schedule).toEqual([
      { title: "Brunch", time: "11:00 AM" },
      { title: "Getting There", time: "Time to be announced" },
    ]);
  });

  it("treats nulls from the strict schema as unchanged instead of deleting existing styles", () => {
    const style = Object.fromEntries(["background", "color", "accent", "align", "width", "padding", "gap", "radius", "columns", "minHeight", "font", "size", "weight", "hidden", "texture", "letterSpacing", "italic", "opacity", "border", "justify", "rotate", "offset"].map((key) => [key, key === "weight" ? "bold" : null]));
    const edit = normalizeModelEdit({ message: "Bolded the title.", summary: "Bolded the title", operations: [{ op: "update_style", nodeId: "title_a", style, removeStyleKeys: null }] });
    expect(edit.operations).toEqual([{ op: "update_style", nodeId: "title_a", style: { weight: "bold" } }]);
    const document = composeSiteDocument({ ...demoEvents[0].config, title: "Solo Title" }, "", (prefix) => `${prefix}_node`);
    const title = walkSiteNodes(document).find((node) => node.id === "title_node")!;
    const applied = applySiteOperations(document, [{ ...edit.operations[0], nodeId: title.id }]);
    expect(findSiteNode(applied.document, title.id)?.style).toEqual({ ...title.style, weight: "bold" });
  });

  it("clears only the style keys the model lists for removal and drops empty style updates", () => {
    const edit = normalizeModelEdit({
      message: "Removed the background.",
      summary: "Removed the background",
      operations: [
        { op: "update_style", nodeId: "box_a", style: { background: null, align: "center" }, removeStyleKeys: ["background", "notAStyle"] },
        { op: "update_style", nodeId: "box_b", style: { background: null }, removeStyleKeys: [] },
      ],
    });
    expect(edit.operations).toEqual([{ op: "update_style", nodeId: "box_a", style: { align: "center", background: null } }]);
  });
});

