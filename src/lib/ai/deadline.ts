import { AI_REQUEST_TIMEOUT_MS } from "@/lib/env";

// AI routes are killed at maxDuration (300s), and after() work counts against the same invocation.
// Every provider call in one request shares this budget so the request finishes, or fails cleanly
// (job marked failed, credit refunded), before the platform kills it mid-write.
export const AI_ROUTE_BUDGET_MS = 280_000;
// Kept back after the last provider call for saving the result, progress updates and refunds.
export const AI_SAVE_RESERVE_MS = 20_000;
// A provider call with less time than this cannot usefully finish; callers use their deterministic fallback.
export const AI_MIN_CALL_MS = 5_000;

/** Absolute time (ms since epoch) by which every provider call in this request must be done. */
export function aiDeadline(startedAt = Date.now()) {
  return startedAt + AI_ROUTE_BUDGET_MS;
}

/**
 * Timeout for the next provider call: the per-call cap, cut to its share of what is left of the budget.
 * `callsLeft` counts this call and any that follow it in the same pipeline. Returns null when there is
 * no useful time left, so the caller skips the provider instead of starting a call it cannot finish.
 */
export function aiCallTimeoutMs(deadline?: number, { callsLeft = 1, now = Date.now() }: { callsLeft?: number; now?: number } = {}) {
  if (deadline === undefined) return AI_REQUEST_TIMEOUT_MS;
  const share = Math.floor((deadline - AI_SAVE_RESERVE_MS - now) / Math.max(1, callsLeft));
  if (share < AI_MIN_CALL_MS) return null;
  return Math.min(AI_REQUEST_TIMEOUT_MS, share);
}
