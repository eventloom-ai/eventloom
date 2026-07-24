import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "10000000-0000-4000-8000-000000000010" } } as { user: { id: string } } | null,
  turnstileConfigured: false,
  verifyHuman: true,
  verifyArgs: null as null | { token: string; options: Record<string, unknown> },
  recentCount: 0,
  recentError: null as null | { code: string },
  insertError: null as null | { code: string },
  inserted: null as null | Record<string, unknown>,
  operationalEvent: vi.fn(),
  client: null as unknown,
}));

vi.mock("@/lib/env", () => ({
  env: { ipHashSecret: () => "feedback-ip-test-secret" },
  isTurnstileConfigured: () => mocks.turnstileConfigured,
}));
vi.mock("@/lib/security/auth", () => ({ getAuthContext: () => mocks.auth }));
vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstile: (token: string, options: Record<string, unknown>) => {
    mocks.verifyArgs = { token, options };
    return mocks.verifyHuman;
  },
}));
vi.mock("@/lib/monitoring", () => ({ reportOperationalEvent: mocks.operationalEvent }));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => mocks.client }));

import { POST } from "@/app/api/feedback/route";

function createClient() {
  return {
    from: vi.fn(() => {
      let inserting = false;
      const builder = {
        select: vi.fn(),
        gte: vi.fn(),
        eq: vi.fn(),
        insert: vi.fn(),
        single: vi.fn(),
        then: (resolve: (value: unknown) => unknown) => resolve({
          count: mocks.recentCount,
          error: mocks.recentError,
        }),
      };
      builder.select.mockImplementation(() => builder);
      builder.gte.mockImplementation(() => builder);
      builder.eq.mockImplementation(() => builder);
      builder.insert.mockImplementation((value: Record<string, unknown>) => {
        inserting = true;
        mocks.inserted = value;
        return builder;
      });
      builder.single.mockImplementation(() => Promise.resolve(
        inserting && !mocks.insertError
          ? { data: { id: "20000000-0000-4000-8000-000000000020" }, error: null }
          : { data: null, error: mocks.insertError },
      ));
      return builder;
    }),
  };
}

function request(body: Record<string, unknown>, origin = "https://eventloom.test") {
  return new NextRequest("https://eventloom.test/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "eventloom.test",
      origin,
      "x-forwarded-for": "203.0.113.14",
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  category: "confusing",
  rating: 3,
  message: "I was not sure what to do after opening the preview.",
  pagePath: "/app/events/example/preview",
  turnstileToken: "",
};

describe("product feedback route", () => {
  beforeEach(() => {
    mocks.auth = { user: { id: "10000000-0000-4000-8000-000000000010" } };
    mocks.turnstileConfigured = false;
    mocks.verifyHuman = true;
    mocks.verifyArgs = null;
    mocks.recentCount = 0;
    mocks.recentError = null;
    mocks.insertError = null;
    mocks.inserted = null;
    mocks.operationalEvent.mockReset();
    mocks.client = createClient();
  });

  it("stores privacy-minimized authenticated feedback through the server client", async () => {
    const response = await POST(request(validBody));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.inserted).toMatchObject({
      user_id: mocks.auth?.user.id,
      category: "confusing",
      rating: 3,
      page_path: "/app/events/example/preview",
    });
    expect(mocks.inserted?.ip_hash).toBeTruthy();
    expect(String(mocks.inserted?.ip_hash)).not.toContain("203.0.113.14");
    expect(mocks.operationalEvent).toHaveBeenCalledWith("info", "product_feedback_received", expect.not.objectContaining({ message: expect.anything() }));
  });

  it("fails closed for anonymous feedback when human verification is unavailable", async () => {
    mocks.auth = null;
    mocks.verifyHuman = false;

    const response = await POST(request(validBody));

    expect(response.status).toBe(400);
    expect(mocks.inserted).toBeNull();
  });

  it("requires human verification for anonymous feedback when Turnstile is configured", async () => {
    mocks.auth = null;
    mocks.turnstileConfigured = true;
    mocks.verifyHuman = false;

    const response = await POST(request(validBody));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "verification_required" });
    expect(mocks.inserted).toBeNull();
    expect(mocks.verifyArgs).toEqual({
      token: "",
      options: {
        expectedAction: "product_feedback",
        expectedHostname: "eventloom.test",
      },
    });
  });

  it("rate limits repeated feedback without storing another message", async () => {
    mocks.recentCount = 5;

    const response = await POST(request(validBody));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: "try_later" });
    expect(mocks.inserted).toBeNull();
  });

  it("rejects cross-origin feedback", async () => {
    const response = await POST(request(validBody, "https://attacker.test"));
    expect(response.status).toBe(400);
    expect(mocks.inserted).toBeNull();
  });
});
