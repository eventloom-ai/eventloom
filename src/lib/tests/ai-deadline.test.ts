import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_MIN_CALL_MS, AI_ROUTE_BUDGET_MS, AI_SAVE_RESERVE_MS, aiCallTimeoutMs, aiDeadline } from "@/lib/ai/deadline";
import { generateSitePlan } from "@/lib/agent/generate-config";
import { AI_REQUEST_TIMEOUT_MS } from "@/lib/env";

const t0 = 1_000_000;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AI route time budget", () => {
  it("keeps the per-call cap without a deadline and cuts calls to what is left of the budget", () => {
    expect(aiCallTimeoutMs(undefined)).toBe(AI_REQUEST_TIMEOUT_MS);
    expect(aiCallTimeoutMs(aiDeadline(t0), { now: t0 })).toBe(AI_REQUEST_TIMEOUT_MS);
    expect(aiCallTimeoutMs(aiDeadline(t0), { now: t0 + 200_000 })).toBe(AI_ROUTE_BUDGET_MS - AI_SAVE_RESERVE_MS - 200_000);
    expect(aiCallTimeoutMs(aiDeadline(t0), { now: t0, callsLeft: 2 })).toBe((AI_ROUTE_BUDGET_MS - AI_SAVE_RESERVE_MS) / 2);
    expect(aiCallTimeoutMs(aiDeadline(t0), { now: t0 + AI_ROUTE_BUDGET_MS - AI_SAVE_RESERVE_MS - AI_MIN_CALL_MS + 1 })).toBeNull();
  });

  it("bounds two sequential worst-case calls under the 300s function limit with time left to save", () => {
    const deadline = aiDeadline(t0);
    let now = t0 + 10_000; // request parsing and image processing
    for (let call = 0; call < 2; call += 1) now += aiCallTimeoutMs(deadline, { now }) ?? 0;
    expect(now - t0).toBeLessThanOrEqual(AI_ROUTE_BUDGET_MS - AI_SAVE_RESERVE_MS);
    expect(AI_ROUTE_BUDGET_MS).toBeLessThan(300_000);
  });

  it("gives the plan call only the remaining budget and skips the provider once it is spent", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await generateSitePlan("Garden supper for Lena", undefined, { deadline: Date.now() + AI_SAVE_RESERVE_MS + 30_000 });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(timeout.mock.calls[0]?.[0]).toBeLessThanOrEqual(30_000);

    const plan = await generateSitePlan("Garden supper for Lena", undefined, { deadline: Date.now() + AI_SAVE_RESERVE_MS });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(plan.config.title).toBeTruthy();
  });
});
