import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refund: vi.fn(async () => true) }));
vi.mock("@/lib/payments/billing", () => ({ refundBuildCredit: mocks.refund }));

import { aiCreditConsumed, settleBuildCredit, type AiRunOutcome } from "@/lib/payments/ai-credit-rule";

describe("AI credit rule (N20)", () => {
  beforeEach(() => mocks.refund.mockReset());

  it.each<[AiRunOutcome, boolean]>([
    [{ status: "succeeded", aiGenerated: true }, true],
    [{ status: "succeeded", aiGenerated: false }, false],
    [{ status: "failed", aiResultShown: false }, false],
    [{ status: "failed", aiResultShown: true }, true],
    [{ status: "cancelled", providerCalled: false }, false],
    [{ status: "cancelled", providerCalled: true }, true],
  ])("%o consumes the credit: %s", (outcome, consumed) => {
    expect(aiCreditConsumed(outcome)).toBe(consumed);
  });

  it("refunds only runs that did not consume the credit", async () => {
    await expect(settleBuildCredit("owner-1", "event-1", "job-1", { status: "succeeded", aiGenerated: true })).resolves.toEqual({ refunded: false });
    expect(mocks.refund).not.toHaveBeenCalled();

    await expect(settleBuildCredit("owner-1", null, "job-2", { status: "succeeded", aiGenerated: false })).resolves.toEqual({ refunded: true });
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", null, "job-2");
  });

  it("never throws when the refund itself fails", async () => {
    mocks.refund.mockRejectedValueOnce(new Error("db down"));
    await expect(settleBuildCredit("owner-1", "event-1", "job-1", { status: "failed", aiResultShown: false })).resolves.toEqual({ refunded: true });
  });
});
