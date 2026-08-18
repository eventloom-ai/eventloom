import { describe, expect, it } from "vitest";
import { searchableRsvpText, summarizeRsvps, type CreatorRsvpSubmission } from "@/lib/rsvp-dashboard";

const submissions: CreatorRsvpSubmission[] = [
  {
    id: "one",
    first_name: "Maya",
    last_name: "Guest",
    email: "maya@example.com",
    phone: null,
    is_attending: true,
    party_size: 3,
    status: "submitted",
    created_at: "2026-07-24T12:00:00.000Z",
    rsvp_guests: [{ name: "Adam Guest" }],
    rsvp_answers: [{ field_key: "note", value: "Needs a high chair" }],
  },
  {
    id: "two",
    first_name: "Noah",
    last_name: "Guest",
    email: null,
    phone: "555-0100",
    is_attending: false,
    party_size: 0,
    status: "submitted",
    created_at: "2026-07-24T13:00:00.000Z",
    rsvp_guests: [],
    rsvp_answers: [],
  },
];

describe("creator RSVP dashboard", () => {
  it("summarizes responses and counts only attending party sizes", () => {
    expect(summarizeRsvps(submissions)).toEqual({
      responses: 2,
      attending: 1,
      declined: 1,
      expectedGuests: 3,
    });
  });

  it("makes contact details, guests, and comments searchable", () => {
    const text = searchableRsvpText(submissions[0]);
    expect(text).toContain("maya@example.com");
    expect(text).toContain("adam guest");
    expect(text).toContain("needs a high chair");
  });
});
