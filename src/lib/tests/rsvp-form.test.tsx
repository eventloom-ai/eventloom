import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RsvpForm } from "@/components/rsvp-form";
import { SiteDocumentRenderer } from "@/components/site-document-renderer";
import { defaultEventConfig } from "@/lib/ai/generator";
import type { SiteDocument } from "@/lib/site-document";

vi.mock("next/image", () => ({ default: () => null }));

const closed = (props: { isDraft?: boolean }) => renderToStaticMarkup(<RsvpForm formToken="" turnstileSiteKey="" isOpen={false} {...props} />);
const theme: SiteDocument["theme"] = { colors: { text: "#191713", surface: "#f7f4ee", accent: "#b48a5a", muted: "#405448" }, typography: { display: "editorial", body: "clean" }, radius: "soft", motion: "none" };
const document: SiteDocument = { schemaVersion: 2, locale: "en", direction: "auto", theme, nodes: [{ id: "sec_rsvp", type: "section", children: [{ id: "rsvp_1", type: "rsvp" }] }] };

describe("closed RSVP form", () => {
  it("tells a draft's visitors that RSVPs open on publish, and a published event's guests that replies are closed", () => {
    expect(closed({ isDraft: true })).toContain("RSVPs open when this event is published.");
    expect(closed({ isDraft: true })).not.toContain("no longer accepting");
    expect(closed({})).toContain("This event is no longer accepting responses.");
  });

  it("uses the draft message on unpublished site documents only", () => {
    const config = defaultEventConfig("Garden supper");
    const render = (status: "draft" | "published") => renderToStaticMarkup(<SiteDocumentRenderer document={document} config={config} status={status} rsvpOpen={false} />);
    expect(render("draft")).toContain("RSVPs open when this event is published.");
    expect(render("published")).toContain("no longer accepting responses");
  });
});
