import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/lib/security/rsvp-token", () => ({ createPublicRsvpToken: () => "token-for-tests-0123456789" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, publicRsvpEnabled: () => true, env: { ...actual.env, turnstileSiteKey: () => "", appUrl: () => "https://eventloom.test" } };
});

import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { EventPage } from "@/components/event-page";
import { RsvpForm } from "@/components/rsvp-form";
import { designEventSite } from "@/lib/event-design/design-event-site";
import type { EventDesign } from "@/lib/event-design/schema";
import { displayRsvpDeadline, endOfDayInZone, parseRsvpDeadline, rsvpDeadlineState, rsvpDeadlineTimestamp } from "@/lib/rsvp-deadline";
import { composeSiteDocument } from "@/lib/site-document";
import type { EventRecord } from "@/lib/types";

describe("RSVP deadline text → events.rsvp_deadline_at", () => {
  it("reads the day from the wordings hosts and the AI write", () => {
    expect(parseRsvpDeadline("June 1, 2027")).toEqual({ year: 2027, month: 6, day: 1 });
    expect(parseRsvpDeadline("Please reply by Saturday, May 15th 2027")).toEqual({ year: 2027, month: 5, day: 15 });
    expect(parseRsvpDeadline("1st of March 2027")).toEqual({ year: 2027, month: 3, day: 1 });
    expect(parseRsvpDeadline("2027-06-01")).toEqual({ year: 2027, month: 6, day: 1 });
    expect(parseRsvpDeadline("Sunday, August 1, 2027 · 5:00 PM")).toEqual({ year: 2027, month: 8, day: 1 });
  });

  it("names no day for empty, vague or impossible deadlines, which clears the column", () => {
    for (const text of ["", "   ", "To be announced", "Please reply before the event", "Soon", "February 30, 2027", "2027-13-01", undefined, null]) {
      expect(parseRsvpDeadline(text), String(text)).toBeNull();
      expect(rsvpDeadlineTimestamp(text, { timeZone: "America/Toronto" })).toBeNull();
    }
  });

  it("takes a missing year from the event, the year before when the day would fall after it", () => {
    expect(parseRsvpDeadline("May 20", "Saturday, June 12, 2027 · 4:00 PM")).toEqual({ year: 2027, month: 5, day: 20 });
    expect(parseRsvpDeadline("December 20", "January 5, 2027")).toEqual({ year: 2026, month: 12, day: 20 });
    // Without any year there is no safe guess.
    expect(parseRsvpDeadline("May 20", "Summer party")).toBeNull();
  });

  it("closes at the end of that day in the event's timezone", () => {
    // Toronto is UTC−4 in June: 23:59:59.999 local is 03:59:59.999Z the next day.
    expect(rsvpDeadlineTimestamp("June 1, 2027", { timeZone: "America/Toronto" })).toBe("2027-06-02T03:59:59.999Z");
    // UTC−5 in winter.
    expect(rsvpDeadlineTimestamp("January 15, 2027", { timeZone: "America/Toronto" })).toBe("2027-01-16T04:59:59.999Z");
    // East of UTC the instant falls on the same UTC day.
    expect(rsvpDeadlineTimestamp("June 1, 2027", { timeZone: "Asia/Tokyo" })).toBe("2027-06-01T14:59:59.999Z");
    // DST starts in Toronto on March 14, 2027; the end of that day is already on daylight time.
    expect(endOfDayInZone({ year: 2027, month: 3, day: 14 }, "America/Toronto")).toBe("2027-03-15T03:59:59.999Z");
  });

  it("falls back to the end of the day in UTC without a known timezone", () => {
    expect(rsvpDeadlineTimestamp("June 1, 2027")).toBe("2027-06-01T23:59:59.999Z");
    expect(rsvpDeadlineTimestamp("June 1, 2027", { timeZone: "Not/AZone" })).toBe("2027-06-01T23:59:59.999Z");
    expect(rsvpDeadlineTimestamp("June 1, 2027", { timeZone: "" })).toBe("2027-06-01T23:59:59.999Z");
  });

  it("writes out machine dates on the page and keeps the host's own wording", () => {
    expect(displayRsvpDeadline("2027-06-01")).toBe("June 1, 2027");
    expect(displayRsvpDeadline("May 20th, if you can")).toBe("May 20th, if you can");
    const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
    const site = designEventSite({ ...wedding.config, rsvpDeadline: "2027-06-01" }, "editorial");
    const rsvp = site.sections.find((section) => section.kind === "rsvp")!;
    expect((rsvp.props as { deadline?: string }).deadline).toBe("June 1, 2027");
  });
});

describe("RSVP closed state after the deadline", () => {
  const now = Date.parse("2027-06-05T12:00:00Z");

  it("is open before the deadline instant and closed from it on, labelled with the host's day", () => {
    expect(rsvpDeadlineState(null, "June 1, 2027", undefined, now)).toEqual({ passed: false });
    expect(rsvpDeadlineState("2027-06-10T03:59:59.999Z", "June 9, 2027", undefined, now)).toEqual({ passed: false });
    expect(rsvpDeadlineState("2027-06-02T03:59:59.999Z", "June 1, 2027", undefined, now)).toEqual({ passed: true, closedOn: "June 1, 2027" });
    // A deadline the text no longer names is still labelled from the stored instant.
    expect(rsvpDeadlineState("2027-06-02T03:59:59.999Z", "", undefined, now)).toEqual({ passed: true, closedOn: "June 2, 2027" });
  });

  it("tells guests when replies closed instead of showing the form", () => {
    const html = renderToStaticMarkup(<RsvpForm formToken="token" turnstileSiteKey="" isOpen={false} closedOn="June 1, 2027" />);
    expect(html).toContain("RSVPs closed on June 1, 2027");
    expect(html).not.toContain("<form");
    // A draft never took replies, so it keeps the draft message.
    expect(renderToStaticMarkup(<RsvpForm formToken="" turnstileSiteKey="" isOpen={false} isDraft closedOn="June 1, 2027" />)).toContain("RSVPs open when this event is published.");
  });

  const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
  const design: EventDesign = { version: 1, styleKey: "editorial", paletteKey: "riviera", content: wedding.content };
  const page = (overrides: Partial<EventRecord>) => renderToStaticMarkup(<EventPage event={{ id: "event-1", slug: "amina-kareem", status: "published", rsvp_open: true, config: { ...wedding.config, rsvpDeadline: "June 1, 2027", design }, ...overrides }} />);

  it("closes the published page's form once events.rsvp_deadline_at has passed", () => {
    vi.useFakeTimers({ now });
    try {
      const closed = page({ rsvp_deadline_at: "2027-06-02T03:59:59.999Z" });
      expect(closed).toContain("RSVPs closed on June 1, 2027");
      expect(closed).not.toContain("Send reply");
      // The page still says when replies were due.
      expect(closed).toContain("Reply by");
      const open = page({ rsvp_deadline_at: "2027-06-30T03:59:59.999Z" });
      expect(open).toContain("Send reply");
      expect(page({ rsvp_deadline_at: null })).toContain("Send reply");
      const legacyConfig = { ...wedding.config, rsvpDeadline: "June 1, 2027" };
      const legacy = page({ config: legacyConfig, document: composeSiteDocument(legacyConfig, "", (prefix) => `${prefix}_node`), rsvp_deadline_at: "2027-06-02T03:59:59.999Z" });
      expect(legacy).toContain("RSVPs closed on June 1, 2027");
    } finally {
      vi.useRealTimers();
    }
  });
});
