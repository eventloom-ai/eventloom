import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: true,
  secret: "turnstile-test-secret",
}));

vi.mock("@/lib/env", () => ({
  env: {
    turnstileSecretKey: () => mocks.secret,
  },
  isTurnstileConfigured: () => mocks.configured,
}));

import { verifyTurnstile } from "@/lib/security/turnstile";
import { TURNSTILE_ACTIONS } from "@/lib/security/turnstile-shared";

function siteverifyResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Turnstile verification", () => {
  beforeEach(() => {
    mocks.configured = true;
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("accepts only a successful token for the expected action and hostname", async () => {
    const fetchMock = vi.fn().mockResolvedValue(siteverifyResponse({
      success: true,
      action: TURNSTILE_ACTIONS.publicRsvp,
      hostname: "EVENTLOOM-BETA.VERCEL.APP.",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstile("valid-token", {
      expectedAction: TURNSTILE_ACTIONS.publicRsvp,
      expectedHostname: "eventloom-beta.vercel.app",
      remoteIp: "203.0.113.9",
    })).resolves.toBe(true);

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = request.body as URLSearchParams;
    expect(body.get("secret")).toBe(mocks.secret);
    expect(body.get("response")).toBe("valid-token");
    expect(body.get("remoteip")).toBe("203.0.113.9");
    expect(request.cache).toBe("no-store");
  });

  it("rejects a valid token issued for another action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(siteverifyResponse({
      success: true,
      action: TURNSTILE_ACTIONS.productFeedback,
      hostname: "eventloom-beta.vercel.app",
    })));

    await expect(verifyTurnstile("replayed-token", {
      expectedAction: TURNSTILE_ACTIONS.publicRsvp,
      expectedHostname: "eventloom-beta.vercel.app",
    })).resolves.toBe(false);
  });

  it("rejects a valid token issued on another hostname", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(siteverifyResponse({
      success: true,
      action: TURNSTILE_ACTIONS.privacyRequest,
      hostname: "attacker.example",
    })));

    await expect(verifyTurnstile("foreign-token", {
      expectedAction: TURNSTILE_ACTIONS.privacyRequest,
      expectedHostname: "eventloom-beta.vercel.app",
    })).resolves.toBe(false);
  });

  it("fails closed in production when Turnstile is not configured", async () => {
    mocks.configured = false;

    await expect(verifyTurnstile("token", {
      expectedAction: TURNSTILE_ACTIONS.productFeedback,
      expectedHostname: "eventloom-beta.vercel.app",
    })).resolves.toBe(false);
  });

  it("allows local development without provider credentials", async () => {
    mocks.configured = false;
    vi.stubEnv("NODE_ENV", "development");

    await expect(verifyTurnstile("", {
      expectedAction: TURNSTILE_ACTIONS.productFeedback,
      expectedHostname: "localhost",
    })).resolves.toBe(true);
  });
});
