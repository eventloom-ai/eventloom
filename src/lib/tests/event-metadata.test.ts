import { describe, expect, it } from "vitest";
import { eventMetadata } from "@/lib/event-metadata";
import type { EventRecord } from "@/lib/types";

function event(config: Partial<EventRecord["config"]>): EventRecord {
  return { id: "e1", slug: "laylas-30th", status: "published", rsvp_open: true, config: { title: "Layla's 30th", subtitle: "Dinner on the roof.", eventType: "birthday", date: "November 21, 2026 at 7:30 PM", venueName: "The Roof at Edition", schedule: [], rsvpFields: [], theme: { mood: "", colors: [], fontPairing: "" }, ...config } } as EventRecord;
}

describe("eventMetadata", () => {
  it("uses the event's own title, details, and canonical while staying out of search", () => {
    const metadata = eventMetadata(event({}), "/laylas-30th");
    expect(metadata.title).toEqual({ absolute: "Layla's 30th" });
    expect(metadata.description).toBe("November 21, 2026 at 7:30 PM · The Roof at Edition");
    expect(metadata.alternates?.canonical).toBe("/laylas-30th");
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("skips placeholder details and unsafe images", () => {
    const metadata = eventMetadata(event({ date: "Date to be announced", venueName: "Venue to be announced", heroImageUrl: "data:image/png;base64,AAA" }), "/x");
    expect(metadata.description).toBe("Dinner on the roof.");
    expect(metadata.openGraph).not.toHaveProperty("images");
  });
});
