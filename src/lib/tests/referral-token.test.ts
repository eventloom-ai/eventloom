import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { referralTokenSecret: () => "referral-test-secret-with-enough-entropy" },
  referralGrowthEnabled: () => true,
}));

import {
  createReferralJourneyReference,
  createReferralSourceToken,
  verifyReferralJourneyReference,
  verifyReferralSourceToken,
} from "@/lib/referrals/token";

describe("referral tokens", () => {
  beforeEach(() => vi.useRealTimers());

  it("round-trips source and journey identifiers with distinct token kinds", () => {
    const source = createReferralSourceToken("event-1", 300)!;
    const journey = createReferralJourneyReference("journey-1", 300)!;

    expect(verifyReferralSourceToken(source)).toMatchObject({ eventId: "event-1" });
    expect(verifyReferralJourneyReference(journey)).toMatchObject({ journeyId: "journey-1" });
    expect(verifyReferralJourneyReference(source)).toBeNull();
    expect(verifyReferralSourceToken(journey)).toBeNull();
  });

  it("rejects tampered and expired references", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T00:00:00Z"));
    const token = createReferralJourneyReference("journey-1", 1)!;
    expect(verifyReferralJourneyReference(`${token.slice(0, -1)}x`)).toBeNull();
    vi.setSystemTime(new Date("2026-07-24T00:00:02Z"));
    expect(verifyReferralJourneyReference(token)).toBeNull();
  });
});
