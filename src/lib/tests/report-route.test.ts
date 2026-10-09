import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, type FakeSupabase } from "@/lib/tests/fake-supabase";

const mocks = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase | null,
  human: true,
  verifyCalls: [] as Array<{ token: string; options: Record<string, unknown> }>,
  events: [] as Array<{ event: string; context: Record<string, unknown> }>,
}));

vi.mock("@/lib/env", () => ({ env: { ipHashSecret: () => "report-test-secret" } }));
vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstile: async (token: string, options: Record<string, unknown>) => {
    mocks.verifyCalls.push({ token, options });
    return mocks.human;
  },
}));
vi.mock("@/lib/monitoring", () => ({ reportOperationalEvent: (_level: string, event: string, context: Record<string, unknown>) => mocks.events.push({ event, context }) }));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => mocks.fake?.client ?? null }));

import { POST } from "@/app/api/reports/route";

const EVENT_ID = "22222222-2222-4222-8222-222222222222";

function request(body: Record<string, unknown>, { ip = "203.0.113.7", origin = "https://eventloom.test" } = {}) {
  return new NextRequest("https://eventloom.test/api/reports", {
    method: "POST",
    headers: { "content-type": "application/json", host: "eventloom.test", origin, "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const valid = { slug: "maya-adam", reason: "phishing", details: "It asks for my bank login.", email: "", turnstileToken: "token-1" };
const reports = () => mocks.fake!.table("abuse_reports");

describe("report route", () => {
  beforeEach(() => {
    mocks.fake = createFakeSupabase({ events: [{ id: EVENT_ID, slug: "maya-adam", status: "published" }] });
    mocks.human = true;
    mocks.verifyCalls = [];
    mocks.events = [];
  });

  it("stores a verified report linked to its event, with a keyed IP hash and no email unless given", async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(reports()).toHaveLength(1);
    expect(reports()[0]).toMatchObject({ event_id: EVENT_ID, slug: "maya-adam", reason: "phishing", details: "It asks for my bank login.", reporter_email: null });
    expect(reports()[0].ip_hash).toEqual(expect.any(String));
    expect(JSON.stringify(reports()[0])).not.toContain("203.0.113.7");
    expect(mocks.verifyCalls[0]).toEqual({ token: "token-1", options: { expectedAction: "abuse_report", expectedHostname: "eventloom.test", remoteIp: "203.0.113.7" } });
    // Logs carry ids and the category only.
    expect(mocks.events).toEqual([{ event: "abuse_report_received", context: { reportId: expect.any(String), eventId: EVENT_ID, reason: "phishing" } }]);
  });

  it("keeps the reporter's email only when provided, and accepts reports for pages that do not exist", async () => {
    await POST(request({ ...valid, slug: "gone-page", email: "Guest@Example.com" }));
    expect(reports()[0]).toMatchObject({ event_id: null, slug: "gone-page", reporter_email: "guest@example.com" });
  });

  it("requires Turnstile", async () => {
    mocks.human = false;
    const response = await POST(request(valid));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "verification_required" });
    expect(reports()).toHaveLength(0);
  });

  it.each([
    ["an unknown reason", { reason: "spam" }],
    ["an invalid slug", { slug: "Not A Slug" }],
    ["overlong details", { details: "x".repeat(2001) }],
    ["an invalid email", { email: "not-an-email" }],
  ])("rejects %s", async (_label, patch) => {
    const response = await POST(request({ ...valid, ...patch }));
    expect(response.status).toBe(400);
    expect(reports()).toHaveLength(0);
  });

  it("rejects cross-site posts", async () => {
    const response = await POST(request(valid, { origin: "https://evil.example" }));
    expect(response.status).toBe(400);
    expect(reports()).toHaveLength(0);
  });

  it("limits storage per network: 2 reports per page per day, 5 per hour overall", async () => {
    expect((await POST(request(valid))).status).toBe(201);
    expect((await POST(request(valid))).status).toBe(201);
    const third = await POST(request(valid));
    expect(third.status).toBe(429);
    await expect(third.json()).resolves.toEqual({ error: "try_later" });

    for (const slug of ["page-a", "page-b", "page-c"]) expect((await POST(request({ ...valid, slug }))).status).toBe(201);
    expect((await POST(request({ ...valid, slug: "page-d" }))).status).toBe(429);
    expect(reports()).toHaveLength(5);

    // Another network is not affected.
    expect((await POST(request({ ...valid, slug: "page-d" }, { ip: "198.51.100.9" }))).status).toBe(201);
  });

  it("is unavailable without a database", async () => {
    mocks.fake = null;
    expect((await POST(request(valid))).status).toBe(503);
  });
});
