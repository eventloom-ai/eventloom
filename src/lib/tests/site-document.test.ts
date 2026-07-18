import { describe, expect, it } from "vitest";
import { defaultEventConfig } from "@/lib/ai/generator";
import { applySiteOperations } from "@/lib/site-document-operations";
import { assertEventAssetOwnership, createDefaultSiteDocument, findSiteNode, siteDocumentSchema, walkSiteNodes } from "@/lib/site-document";

describe("structured event site documents", () => {
  it("creates a valid editable document with stable event bindings and RSVP", () => {
    const config = defaultEventConfig("An editorial wedding celebration in navy and gold");
    const document = createDefaultSiteDocument(config);
    expect(siteDocumentSchema.safeParse(document).success).toBe(true);
    expect(walkSiteNodes(document).some((node) => node.type === "rsvp")).toBe(true);
    expect(walkSiteNodes(document).some((node) => node.type === "text" && node.binding === "event.title")).toBe(true);
  });

  it("starts an image-less hero at a readable size without reserving a viewport-sized gap", () => {
    const document = createDefaultSiteDocument(defaultEventConfig("A birthday dinner"));
    const hero = document.nodes[0];
    expect(hero).toMatchObject({
      type: "section",
      label: "Hero",
      style: { padding: "large", minHeight: "auto", width: "wide", gap: "medium" },
    });
  });

  it("applies a targeted text edit without changing unrelated nodes", () => {
    const document = createDefaultSiteDocument(defaultEventConfig("A birthday party"));
    const text = walkSiteNodes(document).find((node) => node.type === "text" && node.variant === "eyebrow");
    expect(text?.type).toBe("text");
    const beforeTitle = walkSiteNodes(document).find((node) => node.type === "text" && node.binding === "event.title");
    const result = applySiteOperations(document, [{ op: "replace_text", nodeId: text!.id, content: "An unforgettable night" }]);
    expect(findSiteNode(result.document, text!.id)).toMatchObject({ content: "An unforgettable night" });
    expect(findSiteNode(result.document, beforeTitle!.id)).toEqual(beforeTitle);
    expect(result.changedNodeIds).toEqual([text!.id]);
  });

  it("rejects unsafe links and removal of the managed RSVP block", () => {
    const document = createDefaultSiteDocument(defaultEventConfig("A garden party"));
    const rsvp = walkSiteNodes(document).find((node) => node.type === "rsvp");
    expect(() => applySiteOperations(document, [{ op: "remove_node", nodeId: rsvp!.id }])).toThrow(/RSVP/i);
    const unsafe = structuredClone(document);
    const image = { id: "unsafe_image", type: "image" as const, url: "javascript:alert(1)", alt: "Unsafe" };
    const firstSection = unsafe.nodes[0];
    if (firstSection && "children" in firstSection) firstSection.children.push(image);
    expect(siteDocumentSchema.safeParse(unsafe).success).toBe(false);
  });

  it("rejects duplicate node IDs", () => {
    const document = createDefaultSiteDocument(defaultEventConfig("A simple dinner"));
    const duplicate = structuredClone(document.nodes[0]);
    if (duplicate) document.nodes.push(duplicate);
    expect(siteDocumentSchema.safeParse(document).success).toBe(false);
  });

  it("rejects an asset stored under another event", () => {
    const document = createDefaultSiteDocument(defaultEventConfig("A photo party"));
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
