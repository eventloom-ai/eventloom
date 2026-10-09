import { describe, expect, it } from "vitest";
import { optionalFormString } from "@/lib/form-values";
import { evaluateDomainQuote, validateRsvpPayload } from "@/lib/validation";

describe("RSVP validation", () => {
  it("accepts a valid attending RSVP", () => {
    const result = validateRsvpPayload({
      form_token: "signed-public-form-token-value",
      turnstile_token: "test-token",
      idempotency_key: "10000000-0000-4000-8000-000000000001",
      first_name: "Mira",
      last_name: "Hadi",
      is_attending: true,
      party_size: 2,
      guest_names: ["Mira Hadi", "Adam Noor"],
      answers: { note: "Vegetarian" },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects guest count mismatches", () => {
    const result = validateRsvpPayload({
      form_token: "signed-public-form-token-value",
      turnstile_token: "test-token",
      idempotency_key: "10000000-0000-4000-8000-000000000002",
      first_name: "Mira",
      last_name: "Hadi",
      is_attending: true,
      party_size: 3,
      guest_names: ["Mira Hadi"],
      answers: {},
    });

    expect(result.ok).toBe(false);
  });

  it("accepts an RSVP when optional contact controls are hidden", () => {
    const result = validateRsvpPayload({
      form_token: "signed-public-form-token-value",
      turnstile_token: "test-token",
      idempotency_key: "10000000-0000-4000-8000-000000000003",
      first_name: "Taylor",
      last_name: "Guest",
      email: optionalFormString(null),
      phone: optionalFormString(null),
      is_attending: true,
      party_size: 1,
      guest_names: [],
      answers: { note: "Looking forward to it" },
    });

    expect(result.ok).toBe(true);
  });
});

describe("domain quote evaluation", () => {
  it("rejects premium and over-cap domains", () => {
    expect(evaluateDomainQuote({ domain: "x.com", available: true, premium: true, currency: "USD", registrationCost: 10, renewalCost: 10 }, 15).ok).toBe(false);
    expect(evaluateDomainQuote({ domain: "x.com", available: true, premium: false, currency: "USD", registrationCost: 16, renewalCost: 16 }, 15).ok).toBe(false);
  });

  it("accepts standard under-cap domains", () => {
    expect(evaluateDomainQuote({ domain: "miraadam.com", available: true, premium: false, currency: "USD", registrationCost: 12, renewalCost: 12 }, 15).ok).toBe(true);
  });
});
