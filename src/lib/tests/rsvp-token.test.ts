import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { rsvpTokenSecret: () => "rsvp-test-secret-with-enough-entropy" } }));

import { createPublicRsvpToken, verifyPublicRsvpToken } from "@/lib/security/rsvp-token";

describe("public RSVP form tokens", () => {
  beforeEach(() => vi.useRealTimers());

  it("round-trips an event and slug without exposing a trusted form UUID", () => {
    const token = createPublicRsvpToken("event-1", "mira-adam", 300);
    expect(token).toBeTruthy();
    expect(verifyPublicRsvpToken(token!)).toMatchObject({ eventId: "event-1", slug: "mira-adam" });
  });

  it("rejects a changed payload", () => {
    const token = createPublicRsvpToken("event-1", "mira-adam", 300)!;
    const [payload, signature] = token.split(".");
    expect(verifyPublicRsvpToken(`${payload}x.${signature}`)).toBeNull();
  });

  it("rejects a changed signature", () => {
    const token = createPublicRsvpToken("event-1", "mira-adam", 300)!;
    expect(verifyPublicRsvpToken(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T00:00:00Z"));
    const token = createPublicRsvpToken("event-1", "mira-adam", 1)!;
    vi.setSystemTime(new Date("2026-07-22T00:00:02Z"));
    expect(verifyPublicRsvpToken(token)).toBeNull();
  });
});
