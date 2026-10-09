import { describe, expect, it } from "vitest";
import { optionalFormString, rsvpErrorMessage, rsvpPartySize } from "@/lib/form-values";
import { validateRsvpPayload } from "@/lib/validation";

describe("optionalFormString", () => {
  it("normalizes an omitted form control to an empty string", () => {
    expect(optionalFormString(null)).toBe("");
  });

  it("preserves a submitted string value", () => {
    expect(optionalFormString("guest@example.com")).toBe("guest@example.com");
  });
});

describe("rsvpPartySize", () => {
  it("derives the party size from guest names when the form has no party-size field", () => {
    const guestNames = ["Ada Lovelace", "Charles Babbage", "Mary Somerville"];
    const partySize = rsvpPartySize({ attending: true, hasPartySizeField: false, partySize: 1, guestNames });
    expect(partySize).toBe(3);
    const validated = validateRsvpPayload({ form_token: "t".repeat(24), idempotency_key: crypto.randomUUID(), first_name: "Ada", last_name: "Lovelace", is_attending: true, party_size: partySize, guest_names: guestNames });
    expect(validated).toMatchObject({ ok: true });
  });

  it("uses the chosen party size when the field is shown, and zero when not attending", () => {
    expect(rsvpPartySize({ attending: true, hasPartySizeField: true, partySize: 2, guestNames: [] })).toBe(2);
    expect(rsvpPartySize({ attending: true, hasPartySizeField: false, partySize: 1, guestNames: [] })).toBe(1);
    expect(rsvpPartySize({ attending: false, hasPartySizeField: true, partySize: 4, guestNames: ["Ada"] })).toBe(0);
  });
});

describe("rsvpErrorMessage", () => {
  it("explains specific server errors instead of a generic failure", () => {
    expect(rsvpErrorMessage("guest_count_mismatch")).toMatch(/party size/);
    expect(rsvpErrorMessage("unavailable")).toMatch(/not accepting replies/);
    expect(rsvpErrorMessage("try_later")).toMatch(/wait a few minutes/);
    expect(rsvpErrorMessage("server")).toBe("We could not save your reply. Please check the form and try again.");
  });
});
