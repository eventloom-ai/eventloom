import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };

const mocks = vi.hoisted(() => ({
  client: null as null | { rpc: ReturnType<typeof vi.fn> },
  report: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => mocks.client }));
vi.mock("@/lib/monitoring", () => ({ reportOperationalEvent: mocks.report }));
vi.mock("@/lib/env", () => ({ env: { ipHashSecret: () => "rate-limit-test-secret" } }));

import {
  DAY,
  HOUR,
  RATE_LIMITS,
  checkRateLimit,
  consumeInMemory,
  enforceRateLimit,
  resetInMemoryRateLimits,
  type RateLimitRule,
} from "@/lib/security/rate-limit";

function request(ip = "198.51.100.7") {
  return new NextRequest("https://eventloom.test/api/example", { method: "POST", headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
}

function durable(handler: (args: Record<string, unknown>) => RpcResult | Promise<RpcResult>) {
  mocks.client = { rpc: vi.fn(async (_fn: string, args: Record<string, unknown>) => handler(args)) };
  return mocks.client.rpc;
}

const rule: RateLimitRule = { bucket: "test.bucket", by: "ip", window: 60, max: 3 };

beforeEach(() => {
  mocks.client = null;
  mocks.report.mockClear();
  resetInMemoryRateLimits();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sliding-window math (in-memory fallback)", () => {
  it("allows up to max hits per window, then reports when the oldest one ages out", () => {
    const t0 = 1_000_000;
    expect(consumeInMemory("b", "s", 60, 3, t0)).toEqual({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    expect(consumeInMemory("b", "s", 60, 3, t0 + 10_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(consumeInMemory("b", "s", 60, 3, t0 + 20_000)).toMatchObject({ allowed: true, remaining: 0 });
    // Oldest hit (t0) leaves the 60s window at t0 + 60s; 30s have passed.
    expect(consumeInMemory("b", "s", 60, 3, t0 + 30_000)).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 30 });
    // Denied attempts are not recorded, so they do not push the unblock time back.
    expect(consumeInMemory("b", "s", 60, 3, t0 + 59_500)).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 1 });
    expect(consumeInMemory("b", "s", 60, 3, t0 + 60_001)).toMatchObject({ allowed: true, remaining: 0 });
    // Now the hit from t0 + 10s is the one that has to expire.
    expect(consumeInMemory("b", "s", 60, 3, t0 + 61_000)).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 9 });
  });

  it("keeps buckets and subjects independent", () => {
    expect(consumeInMemory("a", "s", 60, 1).allowed).toBe(true);
    expect(consumeInMemory("a", "s", 60, 1).allowed).toBe(false);
    expect(consumeInMemory("a", "other", 60, 1).allowed).toBe(true);
    expect(consumeInMemory("b", "s", 60, 1).allowed).toBe(true);
  });
});

describe("enforceRateLimit in demo mode (no Supabase)", () => {
  it("answers 429 rate_limited with Retry-After once the limit is used", async () => {
    for (let i = 0; i < 3; i += 1) expect(await enforceRateLimit(request(), rule)).toBeNull();
    const limited = await enforceRateLimit(request(), rule);
    expect(limited?.status).toBe(429);
    expect(Number(limited?.headers.get("retry-after"))).toBeGreaterThanOrEqual(59);
    await expect(limited?.json()).resolves.toMatchObject({ error: "rate_limited", retryAfterSeconds: expect.any(Number) });
    // A different address still has its own budget.
    expect(await enforceRateLimit(request("203.0.113.9"), rule)).toBeNull();
  });

  it("falls back to the address for a user rule without a user, so nobody is unlimited", async () => {
    const userRule: RateLimitRule = { bucket: "u", by: "user", window: 60, max: 1 };
    expect(await enforceRateLimit(request(), userRule)).toBeNull();
    expect((await enforceRateLimit(request(), userRule))?.status).toBe(429);
    // A signed-in user is counted separately from their address.
    expect(await enforceRateLimit(request(), userRule, { userId: "user-1" })).toBeNull();
    expect((await enforceRateLimit(request("203.0.113.9"), userRule, { userId: "user-1" }))?.status).toBe(429);
  });

  it("user+ip counts the same limit for the user and for the address", async () => {
    const both: RateLimitRule = { bucket: "both", by: "user+ip", window: 60, max: 1 };
    expect(await enforceRateLimit(request(), both, { userId: "user-1" })).toBeNull();
    // Same user from another network: user budget is used.
    expect((await enforceRateLimit(request("203.0.113.9"), both, { userId: "user-1" }))?.status).toBe(429);
    // Another user from the first network: address budget is used.
    expect((await enforceRateLimit(request(), both, { userId: "user-2" }))?.status).toBe(429);
  });

  it("denies when any of several limits is exhausted", async () => {
    const rules: RateLimitRule[] = [
      { bucket: "hour", by: "user", window: HOUR, max: 5 },
      { bucket: "day", by: "user", window: DAY, max: 2 },
    ];
    expect(await checkRateLimit(request(), rules, { userId: "u" })).toMatchObject({ allowed: true, remaining: 1 });
    expect(await checkRateLimit(request(), rules, { userId: "u" })).toMatchObject({ allowed: true, remaining: 0 });
    const third = await checkRateLimit(request(), rules, { userId: "u" });
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(HOUR);
  });
});

describe("durable limiter (Supabase configured)", () => {
  it("sends hashed subjects to consume_rate_limit, never the raw address or user id", async () => {
    const rpc = durable(() => ({ data: { allowed: true, remaining: 4, retry_after_seconds: 0 }, error: null }));
    expect(await enforceRateLimit(request(), RATE_LIMITS.aiGeneration, { userId: "10000000-0000-4000-8000-000000000001" })).toBeNull();
    expect(rpc).toHaveBeenCalledTimes(3);
    const calls = rpc.mock.calls.map(([fn, args]) => ({ fn, ...(args as Record<string, unknown>) }) as { fn: unknown; p_bucket?: unknown; p_subject?: unknown });
    expect(calls.map((call) => call.fn)).toEqual(["consume_rate_limit", "consume_rate_limit", "consume_rate_limit"]);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ p_bucket: "ai.user.hour", p_window_seconds: HOUR, p_max: 10 }),
      expect.objectContaining({ p_bucket: "ai.user.day", p_window_seconds: DAY, p_max: 40 }),
      expect.objectContaining({ p_bucket: "ai.ip.hour", p_window_seconds: HOUR, p_max: 30 }),
    ]));
    for (const call of calls) {
      expect(call.p_subject).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(String(call.p_subject)).not.toContain("198.51.100.7");
      expect(String(call.p_subject)).not.toContain("10000000");
    }
    const userSubject = calls.find((call) => call.p_bucket === "ai.user.hour")?.p_subject;
    const ipSubject = calls.find((call) => call.p_bucket === "ai.ip.hour")?.p_subject;
    expect(userSubject).not.toBe(ipSubject);
  });

  it("returns the database's retry-after in the 429", async () => {
    durable(() => ({ data: { allowed: false, remaining: 0, retry_after_seconds: 1234 }, error: null }));
    const limited = await enforceRateLimit(request(), rule);
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("retry-after")).toBe("1234");
    await expect(limited?.json()).resolves.toEqual({ error: "rate_limited", retryAfterSeconds: 1234 });
    expect(mocks.report).toHaveBeenCalledWith("warn", "rate_limited", expect.objectContaining({ bucket: "test.bucket" }));
  });

  it("fails open (and logs) when the database errors on an ordinary route", async () => {
    durable(() => ({ data: null, error: { code: "57014", message: "canceling statement" } }));
    expect(await enforceRateLimit(request(), rule)).toBeNull();
    expect(mocks.report).toHaveBeenCalledWith("error", "rate_limiter_unavailable", expect.objectContaining({ bucket: "test.bucket", failClosed: false }));
  });

  it("fails open when the client throws or answers garbage", async () => {
    mocks.client = { rpc: vi.fn(() => { throw new Error("fetch failed"); }) };
    expect(await enforceRateLimit(request(), rule)).toBeNull();
    durable(() => ({ data: 0, error: null }));
    expect(await enforceRateLimit(request(), rule)).toBeNull();
  });

  it("fails closed with 503 on AI routes when the database errors", async () => {
    durable(() => ({ data: null, error: { code: "08006", message: "connection failure" } }));
    const blocked = await enforceRateLimit(request(), RATE_LIMITS.aiGeneration, { userId: "u" });
    expect(blocked?.status).toBe(503);
    expect(blocked?.headers.get("retry-after")).toBe("60");
    await expect(blocked?.json()).resolves.toMatchObject({ error: "rate_limit_unavailable" });
    expect(mocks.report).toHaveBeenCalledWith("error", "rate_limiter_unavailable", expect.objectContaining({ failClosed: true }));
  });

  it("fails closed on AI routes when the database hangs past the timeout", async () => {
    vi.useFakeTimers();
    durable(() => new Promise<RpcResult>(() => undefined));
    const pending = enforceRateLimit(request(), RATE_LIMITS.aiGeneration, { userId: "u" });
    await vi.advanceTimersByTimeAsync(3_000);
    expect((await pending)?.status).toBe(503);
  });

  it("does not take AI routes down when only the migration is missing", async () => {
    durable(() => ({ data: null, error: { code: "PGRST202", message: "Could not find the function" } }));
    expect(await enforceRateLimit(request(), RATE_LIMITS.aiGeneration, { userId: "u" })).toBeNull();
    expect(mocks.report).toHaveBeenCalledWith("error", "rate_limiter_unavailable", expect.objectContaining({ reason: "PGRST202" }));
  });

  it("prefers 429 over 503 when a real limit is hit while another check errors", async () => {
    durable((args) => args.p_bucket === "ai.ip.hour"
      ? { data: { allowed: false, remaining: 0, retry_after_seconds: 99 }, error: null }
      : { data: null, error: { code: "08006" } });
    const response = await enforceRateLimit(request(), RATE_LIMITS.aiGeneration, { userId: "u" });
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("99");
  });
});

describe("limit table", () => {
  it("keeps every window within what the database accepts and purges", () => {
    for (const rules of Object.values(RATE_LIMITS)) {
      for (const limit of rules) {
        expect(limit.bucket).toMatch(/^[a-z0-9][a-z0-9_.:-]{0,63}$/);
        expect(limit.window).toBeGreaterThan(0);
        expect(limit.window).toBeLessThanOrEqual(DAY);
        expect(limit.max).toBeGreaterThan(0);
      }
    }
  });

  it("fails closed only on the routes that spend money per call", () => {
    const failClosed = Object.entries(RATE_LIMITS)
      .filter(([, rules]) => rules.some((limit) => "failClosed" in limit && limit.failClosed))
      .map(([name]) => name);
    expect(failClosed).toEqual(["aiGeneration"]);
  });
});
