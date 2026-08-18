import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  rpcError: null as null | { code: string },
  maintenanceWrites: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/env", () => ({
  env: { cronSecret: () => "cron-secret" },
}));
vi.mock("@/lib/security/request", () => ({
  safeTokenEquals: (actual: string, expected: string) => actual === expected,
}));
vi.mock("@/lib/monitoring", () => ({
  reportOperationalEvent: vi.fn(),
}));
vi.mock("@/lib/payments/stripe", () => ({
  stripeClient: () => null,
}));
vi.mock("@/app/api/stripe/webhook/route", () => ({
  processVerifiedStripeEvent: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  serviceSupabase: () => ({
    rpc: vi.fn().mockResolvedValue({ error: mocks.rpcError, data: 0 }),
    from: (table: string) => {
      const result = table === "provider_webhook_events"
        ? { error: null, count: 0, data: [] }
        : { error: null, count: 0, data: null };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const method of ["delete", "select", "lt", "not", "in", "lte", "eq", "order", "limit"]) {
        builder[method] = vi.fn(chain);
      }
      builder.upsert = vi.fn((value: Record<string, unknown>) => {
        if (table === "maintenance_status") mocks.maintenanceWrites.push(value);
        return Promise.resolve({ error: null });
      });
      builder.update = vi.fn((value: Record<string, unknown>) => {
        if (table === "maintenance_status") mocks.maintenanceWrites.push(value);
        return builder;
      });
      builder.then = (
        resolve: (value: typeof result) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject);
      return builder;
    },
  }),
}));

import { GET } from "@/app/api/cron/maintenance/route";

function request(token = "cron-secret") {
  return new NextRequest("https://eventloom.test/api/cron/maintenance", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("scheduled maintenance heartbeat", () => {
  beforeEach(() => {
    mocks.rpcError = null;
    mocks.maintenanceWrites = [];
  });

  it("records a successful run without exposing operational details", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(mocks.maintenanceWrites).toEqual(expect.arrayContaining([
      expect.objectContaining({ job_key: "daily", last_started_at: expect.any(String) }),
      expect.objectContaining({ last_succeeded_at: expect.any(String), last_error_code: null }),
    ]));
  });

  it("records a failed run and asks the scheduler to retry", async () => {
    mocks.rpcError = { code: "maintenance_query_failed" };
    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "maintenance_failed" });
    expect(mocks.maintenanceWrites).toEqual(expect.arrayContaining([
      expect.objectContaining({ last_failed_at: expect.any(String), last_error_code: "maintenance_query_failed" }),
    ]));
  });

  it("rejects requests without the scheduler secret", async () => {
    const response = await GET(request("wrong"));
    expect(response.status).toBe(401);
    expect(mocks.maintenanceWrites).toHaveLength(0);
  });
});
