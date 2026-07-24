import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    appUrl: () => "https://eventloom.test",
    referralTokenSecret: () => "test-secret",
  },
  referralGrowthEnabled: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => null }));

import { isAutomatedReferralRequest } from "@/app/referral/[token]/route";

describe("referral request classification", () => {
  it("rejects link previews and search crawlers without classifying normal browsers", () => {
    expect(isAutomatedReferralRequest("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isAutomatedReferralRequest("Mozilla/5.0 Googlebot/2.1")).toBe(true);
    expect(isAutomatedReferralRequest("Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36")).toBe(false);
  });
});
