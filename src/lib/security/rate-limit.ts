import "server-only";

import { createHash, createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { reportOperationalEvent } from "@/lib/monitoring";
import { serviceSupabase } from "@/lib/supabase/server";

// Durable rate limiting for app routes. Vercel runs many short-lived function instances, so the
// counters live in Postgres (`public.consume_rate_limit`, migration 20261009120000) and every
// instance sees the same window. Limits per route are listed in docs/ops/DECISIONS.md.

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export type RateLimitSubject = "ip" | "user" | "user+ip";

export type RateLimitRule = {
  /** Counter name, shared by every route that should draw from the same budget. */
  bucket: string;
  /**
   * `ip`: the caller's network address. `user`: the signed-in user, or the address when there is
   * none (demo mode, anonymous callers), so a missing user never means unlimited. `user+ip`: the
   * same limit is counted for the user and, separately, for the address; both must pass.
   */
  by: RateLimitSubject;
  /** Window length in seconds (at most one day; old rows are purged after two). */
  window: number;
  max: number;
  userId?: string | null;
  /**
   * Deny when the limiter itself is down (Supabase configured but the RPC errors). Used by the
   * routes that spend money on every call (AI); everything else fails open and logs.
   */
  failClosed?: boolean;
};

export type RateLimitDecision = { allowed: boolean; remaining: number; retryAfterSeconds: number };

const ai = { failClosed: true } as const;

// One place for every limit, so the table in DECISIONS.md can be checked against the code.
export const RATE_LIMITS = {
  // Every AI entry point (build, studio create, studio chat) draws from the same budget.
  aiGeneration: [
    { bucket: "ai.user.hour", by: "user", window: HOUR, max: 10, ...ai },
    { bucket: "ai.user.day", by: "user", window: DAY, max: 40, ...ai },
    { bucket: "ai.ip.hour", by: "ip", window: HOUR, max: 30, ...ai },
  ],
  assetUpload: [{ bucket: "assets.upload", by: "user", window: HOUR, max: 60 }],
  checkout: [{ bucket: "checkout", by: "user", window: HOUR, max: 10 }],
  domainLookup: [{ bucket: "domains.lookup", by: "ip", window: 10 * MINUTE, max: 30 }],
  rsvpSubmit: [{ bucket: "rsvp.submit", by: "ip", window: 10 * MINUTE, max: 60 }],
  feedback: [{ bucket: "feedback", by: "ip", window: HOUR, max: 5 }],
  privacyRequest: [{ bucket: "privacy.request", by: "ip", window: HOUR, max: 5 }],
  export: [{ bucket: "export", by: "user", window: HOUR, max: 30 }],
  profileUpdate: [{ bucket: "account.profile", by: "user", window: HOUR, max: 30 }],
  accountDelete: [{ bucket: "account.delete", by: "user", window: HOUR, max: 5 }],
  legalAccept: [{ bucket: "legal.accept", by: "user", window: HOUR, max: 20 }],
  organizationCreate: [{ bucket: "org.create", by: "user", window: HOUR, max: 20 }],
  eventDelete: [{ bucket: "event.delete", by: "user", window: HOUR, max: 60 }],
  eventSettings: [{ bucket: "event.settings", by: "user", window: HOUR, max: 120 }],
  rsvpDelete: [{ bucket: "rsvp.delete", by: "user", window: HOUR, max: 300 }],
  studioAutosave: [{ bucket: "studio.save", by: "user", window: HOUR, max: 600 }],
  studioRestore: [{ bucket: "studio.restore", by: "user", window: HOUR, max: 120 }],
  studioCancel: [{ bucket: "studio.cancel", by: "user", window: HOUR, max: 120 }],
  cspReport: [{ bucket: "csp.report", by: "ip", window: MINUTE, max: 120 }],
} as const satisfies Record<string, readonly RateLimitRule[]>;

const RPC_TIMEOUT_MS = 2_500;
const FAIL_CLOSED_RETRY_SECONDS = 60;

function clientIp(request: NextRequest) {
  // On Vercel, x-forwarded-for is set by the edge (client-supplied values are overwritten).
  const forwarded = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashSubject(value: string) {
  let secret = "";
  try {
    secret = env.ipHashSecret();
  } catch {
    secret = "";
  }
  return secret
    ? createHmac("sha256", secret).update(`rate-limit:${value}`).digest("base64url")
    : createHash("sha256").update(`eventloom-rate-limit:${value}`).digest("base64url");
}

function subjectsFor(request: NextRequest, rule: RateLimitRule, userId: string | null | undefined) {
  const ip = `ip:${clientIp(request)}`;
  const user = userId ? `user:${userId}` : null;
  if (rule.by === "ip") return [ip];
  if (rule.by === "user") return [user ?? ip];
  return user ? [user, ip] : [ip];
}

// ---- Demo-mode fallback ---------------------------------------------------------------------
// Without Supabase (local demo, tests) there is no shared store; a per-process sliding log keeps
// the same semantics so dev and tests behave like production on one instance.

const memoryHits = new Map<string, number[]>();
const MEMORY_KEY_LIMIT = 10_000;

export function resetInMemoryRateLimits() {
  memoryHits.clear();
}

export function consumeInMemory(bucket: string, subject: string, windowSeconds: number, max: number, now = Date.now()): RateLimitDecision {
  const key = `${bucket}\u001f${subject}`;
  const windowStart = now - windowSeconds * 1000;
  const hits = (memoryHits.get(key) ?? []).filter((at) => at > windowStart);
  if (hits.length >= max) {
    memoryHits.set(key, hits);
    const unblockingHit = hits[hits.length - max];
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((unblockingHit + windowSeconds * 1000 - now) / 1000)) };
  }
  hits.push(now);
  if (!memoryHits.has(key) && memoryHits.size >= MEMORY_KEY_LIMIT) {
    const oldest = memoryHits.keys().next().value;
    if (oldest !== undefined) memoryHits.delete(oldest);
  }
  memoryHits.set(key, hits);
  return { allowed: true, remaining: max - hits.length, retryAfterSeconds: 0 };
}

// ---- Durable limiter ------------------------------------------------------------------------

type LimiterClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }> };

class LimiterUnavailable extends Error {}

// PostgREST "function not found": the code shipped before migration 20261009120000 was applied.
// That is a deploy-order mistake, not an outage or an attack, so even fail-closed rules let the
// request through (with an error log) instead of taking every AI route down.
const MIGRATION_MISSING = "PGRST202";

function parseDecision(data: unknown): RateLimitDecision {
  const value = data as { allowed?: unknown; remaining?: unknown; retry_after_seconds?: unknown } | null;
  if (!value || typeof value.allowed !== "boolean") throw new LimiterUnavailable("malformed_response");
  return {
    allowed: value.allowed,
    remaining: Number(value.remaining) || 0,
    retryAfterSeconds: Math.max(0, Math.ceil(Number(value.retry_after_seconds) || 0)),
  };
}

async function consumeDurable(client: LimiterClient, bucket: string, subject: string, windowSeconds: number, max: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LimiterUnavailable("timeout")), RPC_TIMEOUT_MS);
  });
  try {
    const { data, error } = await Promise.race([
      client.rpc("consume_rate_limit", { p_bucket: bucket, p_subject: subject, p_window_seconds: windowSeconds, p_max: max }),
      timeout,
    ]);
    if (error) throw new LimiterUnavailable(error.code ?? "rpc_error");
    return parseDecision(data);
  } finally {
    clearTimeout(timer);
  }
}

function limiterClient(): LimiterClient | null | "unavailable" {
  try {
    return serviceSupabase() as LimiterClient | null;
  } catch {
    return "unavailable";
  }
}

/** Checks (and records) one request against every given limit; all must allow it. */
export async function checkRateLimit(
  request: NextRequest,
  limits: RateLimitRule | readonly RateLimitRule[],
  context: { userId?: string | null } = {},
): Promise<RateLimitDecision & { unavailable?: boolean }> {
  const rules = (Array.isArray(limits) ? limits : [limits]) as readonly RateLimitRule[];
  const client = limiterClient();
  const checks = rules.flatMap((rule) => subjectsFor(request, rule, rule.userId ?? context.userId).map((subject) => ({ rule, subject: hashSubject(subject) })));

  const results = await Promise.all(checks.map(async ({ rule, subject }) => {
    if (client === null) return consumeInMemory(rule.bucket, subject, rule.window, rule.max);
    try {
      if (client === "unavailable" || typeof client.rpc !== "function") throw new LimiterUnavailable("client_unavailable");
      return await consumeDurable(client, rule.bucket, subject, rule.window, rule.max);
    } catch (error) {
      reportOperationalEvent("error", "rate_limiter_unavailable", {
        bucket: rule.bucket,
        failClosed: Boolean(rule.failClosed),
        reason: error instanceof Error ? error.message.slice(0, 80) : "unknown",
      });
      return rule.failClosed && !(error instanceof Error && error.message === MIGRATION_MISSING)
        ? { allowed: false, remaining: 0, retryAfterSeconds: FAIL_CLOSED_RETRY_SECONDS, unavailable: true }
        : { allowed: true, remaining: rule.max, retryAfterSeconds: 0 };
    }
  }));

  const denied = results.filter((result) => !result.allowed);
  if (!denied.length) return { allowed: true, remaining: Math.min(...results.map((result) => result.remaining)), retryAfterSeconds: 0 };
  const limited = denied.filter((result) => !("unavailable" in result && result.unavailable));
  const retryAfterSeconds = Math.max(...denied.map((result) => result.retryAfterSeconds), 1);
  return { allowed: false, remaining: 0, retryAfterSeconds, ...(limited.length ? {} : { unavailable: true }) };
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "rate_limited", retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" } },
  );
}

/**
 * Route guard: returns `null` when the request may proceed, otherwise the response to send —
 * 429 `rate_limited` with Retry-After, or (only for `failClosed` rules while the limiter is down)
 * 503 `rate_limit_unavailable`.
 */
export async function enforceRateLimit(
  request: NextRequest,
  limits: RateLimitRule | readonly RateLimitRule[],
  context: { userId?: string | null } = {},
): Promise<NextResponse | null> {
  const decision = await checkRateLimit(request, limits, context);
  if (decision.allowed) return null;
  const rules = (Array.isArray(limits) ? limits : [limits]) as readonly RateLimitRule[];
  reportOperationalEvent("warn", decision.unavailable ? "rate_limit_failed_closed" : "rate_limited", {
    bucket: rules.map((rule) => rule.bucket).join(","),
    path: request.nextUrl.pathname.slice(0, 120),
    retryAfterSeconds: decision.retryAfterSeconds,
  });
  if (decision.unavailable) {
    return NextResponse.json(
      { error: "rate_limit_unavailable", retryAfterSeconds: decision.retryAfterSeconds },
      { status: 503, headers: { "Retry-After": String(decision.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }
  return rateLimitedResponse(decision.retryAfterSeconds);
}
