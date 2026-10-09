import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteDocumentRenderer } from "@/components/site-document-renderer";
import { defaultEventConfig } from "@/lib/ai/generator";
import { coupleTitleLines } from "@/lib/couple-title";
import { composeSiteDocument, walkSiteNodes, type SiteDocument, type SiteNode } from "@/lib/site-document";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/rsvp-form", () => ({ RsvpForm: () => null }));

const theme: SiteDocument["theme"] = { colors: { text: "#f6efe6", surface: "#241814", accent: "#c2a27a", muted: "#8a7a68" }, typography: { display: "romantic", body: "humanist" }, radius: "soft", motion: "none" };
const withHeading = (node: SiteNode): SiteDocument => ({ schemaVersion: 2, locale: "en", direction: "auto", theme, nodes: [{ id: "sec_opening", type: "section", children: [node, { id: "rsvp_1", type: "rsvp" }] }] });

describe("couple titles", () => {
  it("splits only couple-type event titles", () => {
    expect(coupleTitleLines("Amina & Kareem", "wedding")).toEqual(["Amina", "Kareem"]);
    expect(coupleTitleLines("Maya and Adam", "Engagement party")).toEqual(["Maya", "Adam"]);
    expect(coupleTitleLines("Rock and Roll Night", "birthday")).toBeNull();
    expect(coupleTitleLines("Food & Drinks", "event")).toBeNull();
  });

  it("binds the composed title instead of freezing a split copy, so non-couple titles stay on one line", () => {
    const party = { ...defaultEventConfig("Rock and Roll Night birthday party"), title: "Rock and Roll Night", eventType: "birthday" };
    const document = composeSiteDocument(party, "Rock and Roll Night birthday party");
    expect(walkSiteNodes(document).some((node) => node.type === "text" && node.binding === "event.title" && !node.content)).toBe(true);
    const html = renderToStaticMarkup(<SiteDocumentRenderer document={document} config={party} status="draft" rsvpOpen={false} />);
    expect(html).toContain("Rock and Roll Night");
    expect(html).not.toContain("Rock\n&amp;\nRoll");
  });

  it("splits the bound title for weddings but never other headings", () => {
    const wedding = { ...defaultEventConfig("Wedding event"), title: "Amina & Kareem" };
    const title = renderToStaticMarkup(<SiteDocumentRenderer document={withHeading({ id: "txt_title", type: "text", binding: "event.title", variant: "heading" })} config={wedding} status="draft" rsvpOpen={false} />);
    const other = renderToStaticMarkup(<SiteDocumentRenderer document={withHeading({ id: "txt_menu", type: "text", content: "Food and Drinks", variant: "heading" })} config={wedding} status="draft" rsvpOpen={false} />);
    expect(title).toContain("Amina\n&amp;\nKareem");
    expect(other).toContain("Food and Drinks");
  });
});
