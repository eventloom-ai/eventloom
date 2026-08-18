import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  databaseError: null as unknown,
  staleFeedbackCount: 0,
  maintenanceData: {
    last_started_at: "2026-07-24T00:00:00.000Z",
    last_succeeded_at: "2026-07-24T00:01:00.000Z",
    last_failed_at: null,
  },
}));

vi.mock("@/lib/env", () => ({
  env: { readinessToken: () => "ready-secret", stripeWebhookSecret: () => "whsec_test" },
  isOpenSrsConfigured: () => true,
  isStripeConfigured: () => true,
  isSupabaseConfigured: () => true,
  isTurnstileConfigured: () => true,
  isVercelConfigured: () => true,
  legalIdentityConfigured: () => true,
  externalLaunchReviewsApproved: () => true,
  monitoringConfigured: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => ({ from: (table: string) => {
  const builder = { select: vi.fn(), limit: vi.fn(), eq: vi.fn(), in: vi.fn(), lte: vi.fn(), not: vi.fn(), maybeSingle: vi.fn() };
  builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder); builder.not.mockReturnValue(builder);
  builder.in.mockImplementation(() => table === "legal_documents" ? Promise.resolve({ error: null, count: 3 }) : builder);
  builder.lte.mockResolvedValue({ error: null, count: table === "product_feedback" ? mocks.staleFeedbackCount : 0 });
  builder.limit.mockResolvedValue({ error: mocks.databaseError });
  builder.maybeSingle.mockResolvedValue({ error: null, data: mocks.maintenanceData });
  return builder;
} }) }));
vi.mock("@/lib/security/auth", () => ({ getAuthContext: () => null, hasRequiredMfa: () => false }));
vi.mock("@/lib/platform-admin", () => ({ isPlatformAdmin: () => false }));

import { GET } from "@/app/api/health/ready/route";

function request(token = "ready-secret") { return new NextRequest("https://eventloom.test/api/health/ready", { headers: { authorization: `Bearer ${token}` } }); }

describe("private readiness monitoring", () => {
  beforeEach(() => {
    mocks.databaseError = null;
    mocks.staleFeedbackCount = 0;
    mocks.maintenanceData = {
      last_started_at: new Date(Date.now() - 60_000).toISOString(),
      last_succeeded_at: new Date(Date.now() - 30_000).toISOString(),
      last_failed_at: null,
    };
  });
  it("reports all configured release dependencies to an authenticated monitor", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ready: true, checks: { database: true, stripe: true, registrar: true, turnstile: true, legalIdentity: true, feedbackQueue: true, maintenance: true } });
  });
  it("returns 503 when the database cannot be reached", async () => {
    mocks.databaseError = { code: "database_unavailable" };
    const response = await GET(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ready: false, checks: { database: false } });
  });
  it("returns 503 when feedback has not been addressed within 24 hours", async () => {
    mocks.staleFeedbackCount = 1;
    const response = await GET(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ready: false, checks: { feedbackQueue: false } });
  });
  it("does not expose readiness details publicly", async () => {
    const response = await GET(request("wrong"));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });
});
