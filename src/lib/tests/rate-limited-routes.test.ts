import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// One route per limit category, run through the real limiter with a database that says "over the
// limit" (or errors), to prove each route consults it before doing any work.

type Decision = { allowed: boolean; remaining: number; retry_after_seconds: number } | null;

const mocks = vi.hoisted(() => ({
  decision: { allowed: false, remaining: 0, retry_after_seconds: 600 } as Decision,
  rpcError: null as null | { code: string; message: string },
  buckets: [] as string[],
  report: vi.fn(),
  reserveBuildCredit: vi.fn(),
  user: { id: "10000000-0000-4000-8000-000000000001", email: "creator@example.com" },
}));

vi.mock("@/lib/supabase/server", () => ({
  serviceSupabase: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== "consume_rate_limit") return { data: null, error: null };
      mocks.buckets.push(String(args.p_bucket));
      return { data: mocks.rpcError ? null : mocks.decision, error: mocks.rpcError };
    },
    from: () => { throw new Error("route did work past the limiter"); },
  }),
  getServerUser: async () => mocks.user,
  createSupabaseServerClient: async () => null,
}));
vi.mock("@/lib/security/auth", () => ({
  getAuthContext: async () => ({ user: mocks.user, emailVerified: true, aal: "aal2", nextAal: "aal2" }),
  hasRequiredMfa: () => true,
}));
vi.mock("@/lib/studio-store", () => ({
  canEditEvent: async () => true,
  loadStudioState: async () => null,
  createStudioRun: vi.fn(),
  createBuilderMessage: vi.fn(),
  updateStudioRun: vi.fn(),
  commitStudioRevision: vi.fn(),
  seedInitialRevision: vi.fn(),
}));
vi.mock("@/lib/payments/billing", () => ({ reserveBuildCredit: mocks.reserveBuildCredit, isEventOwner: vi.fn() }));
vi.mock("@/lib/monitoring", () => ({ reportOperationalEvent: mocks.report }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    env: { ...actual.env, ipHashSecret: () => "route-test-secret" },
    publicRsvpEnabled: () => true,
    publicDomainPurchasingEnabled: () => true,
    publicCheckoutEnabled: () => true,
    legalIdentityConfigured: () => true,
  };
});

import { POST as studioMessages } from "@/app/api/events/[eventId]/studio/messages/route";
import { POST as studioCreate } from "@/app/api/events/studio/route";
import { POST as uploadAsset } from "@/app/api/events/[eventId]/assets/route";
import { POST as publish } from "@/app/api/events/[eventId]/publish/route";
import { POST as checkDomains } from "@/app/api/domains/check/route";
import { POST as submitRsvp } from "@/app/api/rsvp/route";
import { POST as sendFeedback } from "@/app/api/feedback/route";
import { POST as privacyRequest } from "@/app/api/privacy/requests/route";
import { PATCH as autosave } from "@/app/api/events/[eventId]/studio/route";
import { GET as exportRsvps } from "@/app/api/events/[eventId]/rsvps/export/route";
import { POST as cspReport } from "@/app/api/csp-report/route";

const eventId = "20000000-0000-4000-8000-000000000002";
const eventParams = { params: Promise.resolve({ eventId }) };

function post(path: string, body: unknown = {}, method = "POST") {
  return new NextRequest(`https://eventloom.test${path}`, {
    method,
    headers: { origin: "https://eventloom.test", host: "eventloom.test", "content-type": "application/json", "x-forwarded-for": "198.51.100.20" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

async function expectRateLimited(response: Response, buckets: string[]) {
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("600");
  await expect(response.json()).resolves.toEqual({ error: "rate_limited", retryAfterSeconds: 600 });
  expect(new Set(mocks.buckets)).toEqual(new Set(buckets));
}

beforeEach(() => {
  mocks.decision = { allowed: false, remaining: 0, retry_after_seconds: 600 };
  mocks.rpcError = null;
  mocks.buckets = [];
  mocks.report.mockClear();
  mocks.reserveBuildCredit.mockClear();
});

describe("AI routes", () => {
  it("studio chat is limited per user and per address before any credit is reserved", async () => {
    await expectRateLimited(await studioMessages(post(`/api/events/${eventId}/studio/messages`, { message: "Make it blue", baseVersionId: "v1" }), eventParams), ["ai.user.hour", "ai.user.day", "ai.ip.hour"]);
    expect(mocks.reserveBuildCredit).not.toHaveBeenCalled();
  });

  it("studio create shares the same AI budget", async () => {
    await expectRateLimited(await studioCreate(post("/api/events/studio")), ["ai.user.hour", "ai.user.day", "ai.ip.hour"]);
    expect(mocks.reserveBuildCredit).not.toHaveBeenCalled();
  });

  it("fails closed when the limiter database errors", async () => {
    mocks.rpcError = { code: "08006", message: "connection failure" };
    const response = await studioMessages(post(`/api/events/${eventId}/studio/messages`, { message: "Make it blue", baseVersionId: "v1" }), eventParams);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "rate_limit_unavailable" });
    expect(mocks.reserveBuildCredit).not.toHaveBeenCalled();
  });
});

describe("uploads, checkout and domains", () => {
  it("limits photo uploads per user", async () => {
    await expectRateLimited(await uploadAsset(post(`/api/events/${eventId}/assets`), eventParams), ["assets.upload"]);
  });

  it("limits publish/checkout per user", async () => {
    await expectRateLimited(await publish(post(`/api/events/${eventId}/publish`), eventParams), ["checkout"]);
  });

  it("limits registrar lookups per address", async () => {
    await expectRateLimited(await checkDomains(post("/api/domains/check", { domains: ["example.com"] })), ["domains.lookup"]);
  });
});

describe("public forms", () => {
  it("limits RSVP submissions per address on top of the database's per-event limit", async () => {
    await expectRateLimited(await submitRsvp(post("/api/rsvp", {})), ["rsvp.submit"]);
  });

  it("limits feedback and privacy requests per address", async () => {
    await expectRateLimited(await sendFeedback(post("/api/feedback", {})), ["feedback"]);
    mocks.buckets = [];
    await expectRateLimited(await privacyRequest(post("/api/privacy/requests", {})), ["privacy.request"]);
  });

  it("drops CSP reports over the limit silently", async () => {
    const response = await cspReport(post("/api/csp-report", { "csp-report": { "violated-directive": "script-src" } }));
    expect(response.status).toBe(204);
    expect(mocks.buckets).toEqual(["csp.report"]);
    expect(mocks.report).not.toHaveBeenCalled();
  });
});

describe("editing and exports", () => {
  it("limits studio autosave generously per user", async () => {
    await expectRateLimited(await autosave(post(`/api/events/${eventId}/studio`, { baseVersionId: "v1", operations: [] }, "PATCH"), eventParams), ["studio.save"]);
  });

  it("autosave fails open when the limiter database errors", async () => {
    mocks.rpcError = { code: "08006", message: "connection failure" };
    // Past the limiter, the (mocked) studio state is missing, so the route answers 404 itself.
    const response = await autosave(post(`/api/events/${eventId}/studio`, { baseVersionId: "v1", operations: [] }, "PATCH"), eventParams);
    expect(response.status).toBe(404);
    expect(mocks.report).toHaveBeenCalledWith("error", "rate_limiter_unavailable", expect.objectContaining({ bucket: "studio.save", failClosed: false }));
  });

  it("limits guest-list exports per user", async () => {
    await expectRateLimited(await exportRsvps(post(`/api/events/${eventId}/rsvps/export`, undefined, "GET"), eventParams), ["export"]);
  });
});
