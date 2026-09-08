import { describe, expect, it } from "vitest";
import { composeSiteDocument } from "@/lib/site-document";
import { puckDataToEventPatch, puckDataToSiteDocument, selectedPuckNodeId, siteDocumentToPuckData } from "@/lib/puck-document";
import type { EventConfig } from "@/lib/types";

const config: EventConfig = {
  title: "Ava & Noah",
  subtitle: "Dinner under the stars",
  eventType: "wedding",
  date: "2027-06-14T18:00",
  venueName: "Hawthorn House",
  schedule: [{ title: "Dinner", time: "7:00 PM" }],
  rsvpFields: ["name", "attendance"],
  theme: { mood: "romantic", colors: ["#211a18", "#fff9f2", "#b87962", "#718276"], fontPairing: "editorial" },
};

describe("Puck document adapter", () => {
  it("round-trips an Eventloom document without changing its meaning", () => {
    const document = composeSiteDocument(config, "", (prefix) => `${prefix}_fixed`);
    expect(puckDataToSiteDocument(siteDocumentToPuckData(document))).toEqual(document);
  });

  it("turns newly inserted Puck components into valid Eventloom nodes", () => {
    const document = composeSiteDocument(config, "", (prefix) => `${prefix}_fixed`);
    const data = siteDocumentToPuckData(document);
    data.content.splice(1, 0, {
      type: "Section",
      props: {
        id: "Section-New",
        label: "Story",
        padding: "large",
        content: [{ type: "Text", props: { id: "Text-New", content: "How we met", binding: "", variant: "heading" } }],
      },
    });
    const converted = puckDataToSiteDocument(data);
    expect(converted.nodes[1]).toMatchObject({ type: "section", label: "Story" });
    expect(converted.nodes[1]).toHaveProperty("children.0.content", "How we met");
  });

  it("carries editable event details and resolves nested selections", () => {
    const document = composeSiteDocument(config, "", (prefix) => `${prefix}_fixed`);
    const data = siteDocumentToPuckData(document, config);
    const first = data.content[0];
    expect(puckDataToEventPatch(data)).toMatchObject({ title: "Ava & Noah", venueName: "Hawthorn House" });
    expect(selectedPuckNodeId(data, { zone: `${first.props.id}:content`, index: 0 })).toBe((first.props.content as typeof data.content)[0]?.props.id);
  });
});
