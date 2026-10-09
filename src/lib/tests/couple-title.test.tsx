import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteDocumentRenderer } from "@/components/site-document-renderer";
import { defaultEventConfig } from "@/lib/ai/generator";
import { coupleTitleLines, eventInitials } from "@/lib/couple-title";
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

  it("only gives couple-type events a two-letter monogram", () => {
    expect(eventInitials("Amina & Kareem", "wedding")).toBe("A & K");
    expect(eventInitials("maya and adam", "engagement")).toBe("M & A");
    expect(eventInitials("Rock and Roll Night", "birthday")).toBe("R");
    expect(eventInitials("Food & Drinks", "event")).toBe("F");
    expect(eventInitials("", "event")).toBe("");
    const document: SiteDocument = { schemaVersion: 2, locale: "en", direction: "auto", theme, nodes: [{ id: "sec_a", type: "section", children: [{ id: "txt_initials", type: "text", variant: "eyebrow", binding: "event.initials" }] }] };
    const party = { ...defaultEventConfig("Rock and Roll Night"), title: "Rock and Roll Night", eventType: "birthday" };
    const html = renderToStaticMarkup(<SiteDocumentRenderer document={document} config={party} status="draft" rsvpOpen={false} />);
    expect(html).not.toContain("R &amp; R");
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
