import { describe, expect, it } from "vitest";
import { evaluateDomainQuote, validateGeneratedArtifact, validateRsvpPayload } from "@/lib/validation";

describe("RSVP validation", () => {
  it("accepts a valid attending RSVP", () => {
    const result = validateRsvpPayload({
      slug: "mira-adam",
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
      slug: "mira-adam",
      first_name: "Mira",
      last_name: "Hadi",
      is_attending: true,
      party_size: 3,
      guest_names: ["Mira Hadi"],
      answers: {},
    });

    expect(result.ok).toBe(false);
  });
});

describe("generated artifact validation", () => {
  it("rejects scripts and event handlers", () => {
    expect(
      validateGeneratedArtifact({
        html: "<section><script>alert(1)</script></section>",
        css: "",
        generatedAt: new Date().toISOString(),
        model: "x",
      }).ok,
    ).toBe(false);

    expect(
      validateGeneratedArtifact({
        html: "<section onclick='x'>hello world safe length</section>",
        css: "",
        generatedAt: new Date().toISOString(),
        model: "x",
      }).ok,
    ).toBe(false);
  });

  it("accepts safe frontend markup", () => {
    const result = validateGeneratedArtifact({
      html: "<section><h1>Mira &amp; Adam</h1><p>Custom event page.</p></section>",
      css: ".hero{padding:2rem}",
      generatedAt: new Date().toISOString(),
      model: "test",
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
