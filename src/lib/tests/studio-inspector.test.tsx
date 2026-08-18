import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudioInspector } from "@/components/studio-inspector";
import type { EventConfig } from "@/lib/types";

const config: EventConfig = {
  title: "Graduation Party",
  subtitle: "Celebrate together",
  eventType: "graduation",
  date: "2026-08-03T19:00",
  venueName: "Community Hall",
  venueAddress: "123 Main Street",
  rsvpDeadline: "2026-07-27T19:00",
  schedule: [{ time: "7:00 PM", title: "Welcome", location: "Community Hall" }],
  rsvpFields: ["name", "attendance"],
  theme: { mood: "warm", colors: ["#fff"], fontPairing: "editorial" },
};

describe("studio event detail controls", () => {
  it("offers native date/time pickers and address assistance without changing the event contract", () => {
    const html = renderToStaticMarkup(
      <StudioInspector
        eventId="10000000-0000-4000-8000-000000000001"
        node={null}
        config={config}
        disabled={false}
        onOperations={vi.fn()}
        onEventPatch={vi.fn()}
      />,
    );

    expect((html.match(/type="datetime-local"/g) ?? []).length).toBe(2);
    expect(html).toContain("Venue address");
    expect(html).toContain("Start typing the venue address");
    expect(html).toContain("Search in Google Maps");
    expect(html).toContain("Or enter a custom description");
  });
});
