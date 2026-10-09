import { refundBuildCredit } from "@/lib/payments/billing";

/**
 * How an AI run (main build, studio create, studio edit) ended, for deciding its credit. See DECISIONS.md (N20).
 * - succeeded: `aiGenerated` is true when at least one provider call returned output that the saved result uses.
 * - failed: `aiResultShown` is true when the AI output had already reached the user before the failure
 *   (studio patches are streamed to the editor before they are saved).
 * - cancelled: `providerCalled` is true once a provider request was sent.
 */
export type AiRunOutcome =
  | { status: "succeeded"; aiGenerated: boolean }
  | { status: "failed"; aiResultShown: boolean }
  | { status: "cancelled"; providerCalled: boolean };

/**
 * The one credit rule: a credit is consumed only when the user gets a successful AI result.
 * Provider failures, timeouts and fallbacks to deterministic (non-AI) output are refunded, as are runs that fail
 * before the user saw any AI output. A user who cancels after the provider was called keeps the cost (S4), and so
 * does a run whose AI output was already streamed to the user — neither can be used to get AI work for free.
 */
export function aiCreditConsumed(outcome: AiRunOutcome): boolean {
  switch (outcome.status) {
    case "succeeded":
      return outcome.aiGenerated;
    case "failed":
      return outcome.aiResultShown;
    case "cancelled":
      return outcome.providerCalled;
  }
}

/** Applies the rule to a run that reserved a credit. Refunds are idempotent per job id; never throws. */
export async function settleBuildCredit(userId: string, eventId: string | null, jobId: string, outcome: AiRunOutcome): Promise<{ refunded: boolean }> {
  if (aiCreditConsumed(outcome)) return { refunded: false };
  try {
    await refundBuildCredit(userId, eventId, jobId);
  } catch {
    // Bookkeeping must not change the run's outcome.
  }
  return { refunded: true };
}
