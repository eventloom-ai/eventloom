import { describe, expect, it } from "vitest";
import { defaultEventConfig } from "@/lib/ai/generator";
import { applySiteOperations } from "@/lib/site-document-operations";
import { assertEventAssetOwnership, composeSiteDocument, findSiteNode, siteDocumentSchema, walkSiteNodes } from "@/lib/site-document";

function documentFor(prompt: string) {
  return composeSiteDocument(defaultEventConfig(prompt), prompt);
}

describe("structured event site documents", () => {
  it("creates a valid editable document with stable event bindings and RSVP", () => {
    const document = documentFor("An editorial wedding celebration in navy and gold");
    expect(siteDocumentSchema.safeParse(document).success).toBe(true);
    expect(walkSiteNodes(document).some((node) => node.type === "rsvp")).toBe(true);
    expect(walkSiteNodes(document).some((node) => node.type === "text" && node.binding === "event.title")).toBe(true);
  });

  it("does not seed a canned wedding layout", () => {
    const document = documentFor("i have a wedding of my brother osama and nour");
    const copy = walkSiteNodes(document).flatMap((node) => node.type === "text" && node.content ? [node.content] : []);
    expect(copy).not.toContain("The celebration");
    expect(copy).not.toContain("Meet us there");
    expect(document.nodes[0]?.label).not.toBe("Hero");
  });

  it("composes different opening structures for different briefs", () => {
    const wedding = documentFor("A candlelit garden wedding for Maya and Adam");
    const launch = documentFor("A product launch night for a design studio");
    expect(wedding.theme.typography.display).toBe("romantic");
    expect(launch.theme.typography.display).toBe("modern");
  });

  it("applies a targeted text edit without changing unrelated nodes", () => {
    const document = documentFor("A birthday party");
    const text = walkSiteNodes(document).find((node) => node.type === "text" && node.variant === "eyebrow");
    expect(text?.type).toBe("text");
    const beforeTitle = walkSiteNodes(document).find((node) => node.type === "text" && node.binding === "event.title");
    const result = applySiteOperations(document, [{ op: "replace_text", nodeId: text!.id, content: "An unforgettable night" }]);
    expect(findSiteNode(result.document, text!.id)).toMatchObject({ content: "An unforgettable night" });
    expect(findSiteNode(result.document, beforeTitle!.id)).toEqual(beforeTitle);
    expect(result.changedNodeIds).toEqual([text!.id]);
  });

  it("rejects unsafe links and removal of the managed RSVP block", () => {
    const document = documentFor("A garden party");
    const rsvp = walkSiteNodes(document).find((node) => node.type === "rsvp");
    expect(() => applySiteOperations(document, [{ op: "remove_node", nodeId: rsvp!.id }])).toThrow(/RSVP/i);
    const unsafe = structuredClone(document);
    const image = { id: "unsafe_image", type: "image" as const, url: "javascript:alert(1)", alt: "Unsafe" };
    const firstSection = unsafe.nodes[0];
    if (firstSection && "children" in firstSection) firstSection.children.push(image);
    expect(siteDocumentSchema.safeParse(unsafe).success).toBe(false);
  });

  it("rejects duplicate node IDs", () => {
    const document = documentFor("A simple dinner");
    const duplicate = structuredClone(document.nodes[0]);
    if (duplicate) document.nodes.push(duplicate);
    expect(siteDocumentSchema.safeParse(document).success).toBe(false);
  });

  it("rejects an asset stored under another event", () => {
    const document = documentFor("A photo party");
    const firstSection = document.nodes[0];
    if (firstSection && "children" in firstSection) firstSection.children.push({
      id: "owned_image",
      type: "image",
      url: "https://example.supabase.co/storage/v1/object/public/event-assets/event-b/photo.webp",
      alt: "Reference",
    });
    expect(() => assertEventAssetOwnership(document, "event-a")).toThrow("asset_not_owned_by_event");
    expect(() => assertEventAssetOwnership(document, "event-b")).not.toThrow();
  });
});
