import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verifyRegistrar: vi.fn() }));

vi.mock("@/lib/domains/provider", () => ({
  verifyOpenSrsRegistrarAccess: mocks.verifyRegistrar,
}));

import { getAgentRuntime, getVerifiedAgentRuntime } from "@/lib/agent/runtime";
import { openaiResponsesOptions } from "@/lib/env";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  mocks.verifyRegistrar.mockReset();
});

function configureBaseRuntime() {
  process.env.STRIPE_SECRET_KEY = "sk_test_runtime";
  process.env.VERCEL_API_TOKEN = "vercel_runtime";
  process.env.VERCEL_PROJECT_ID = "prj_runtime";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_runtime";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_runtime";
}

describe("agent domain-selling capability", () => {
  it("stays disabled when Stripe works but registrar credentials are missing", () => {
    configureBaseRuntime();
    delete process.env.OPENSRS_USERNAME;
    delete process.env.OPENSRS_API_KEY;

    expect(getAgentRuntime().capabilities.sell_domains).toBe(false);
  });

  it("is enabled only when payment, storage, registrar, and Vercel attachment are configured", () => {
    configureBaseRuntime();
    process.env.OPENSRS_USERNAME = "opensrs_runtime";
    process.env.OPENSRS_API_KEY = "opensrs_key_runtime";
    process.env.OPENSRS_API_URL = "https://horizon.opensrs.net:55443";
    process.env.REGISTRANT_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    process.env.DOMAIN_PURCHASING_ENABLED = "true";

    expect(getAgentRuntime().capabilities.sell_domains).toBe(true);
  });

  it("does not report domain sales when the configured registrar token is unauthorized", async () => {
    configureBaseRuntime();
    process.env.OPENSRS_USERNAME = "opensrs_runtime";
    process.env.OPENSRS_API_KEY = "opensrs_key_runtime";
    process.env.OPENSRS_API_URL = "https://horizon.opensrs.net:55443";
    process.env.REGISTRANT_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    process.env.DOMAIN_PURCHASING_ENABLED = "true";
    mocks.verifyRegistrar.mockResolvedValue(false);

    const runtime = await getVerifiedAgentRuntime();

    expect(runtime.capabilities.sell_domains).toBe(false);
    expect(runtime.missing).toContain("OPENSRS_API_KEY (unauthorized)");
  });

  it("reports domain sales after a read-only registrar authorization check succeeds", async () => {
    configureBaseRuntime();
    process.env.OPENSRS_USERNAME = "opensrs_runtime";
    process.env.OPENSRS_API_KEY = "opensrs_key_runtime";
    process.env.OPENSRS_API_URL = "https://horizon.opensrs.net:55443";
    process.env.REGISTRANT_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    process.env.DOMAIN_PURCHASING_ENABLED = "true";
    mocks.verifyRegistrar.mockResolvedValue(true);

    await expect(getVerifiedAgentRuntime()).resolves.toMatchObject({
      capabilities: { sell_domains: true },
    });
  });
});

describe("agent model defaults", () => {
  function clearAiEnv() {
    for (const name of Object.keys(process.env)) {
      if (/^(OPENAI|AI)_(MODEL|REASONING_EFFORT)/.test(name)) delete process.env[name];
    }
  }

  it("defaults to gpt-5.6-luna with per-call reasoning effort", () => {
    clearAiEnv();

    expect(getAgentRuntime()).toMatchObject({
      model: "gpt-5.6-luna",
      reasoningEffort: { planner: "low", "art-director": "low", "original-site": "medium", "studio-edit": "medium" },
    });
    expect(openaiResponsesOptions("planner")).toEqual({ model: "gpt-5.6-luna", reasoning: { effort: "low" } });
  });

  it("lets a global override force every call and a per-purpose override win over it", () => {
    clearAiEnv();
    process.env.OPENAI_REASONING_EFFORT = "high";
    process.env.OPENAI_REASONING_EFFORT_STUDIO_EDIT = "xhigh";

    expect(getAgentRuntime().reasoningEffort).toEqual({ planner: "high", "art-director": "high", "original-site": "high", "studio-edit": "xhigh" });
  });

  it("ignores invalid overrides", () => {
    clearAiEnv();
    process.env.AI_REASONING_EFFORT = "turbo";
    process.env.OPENAI_REASONING_EFFORT_PLANNER = "lots";

    expect(openaiResponsesOptions("planner").reasoning).toEqual({ effort: "low" });
    expect(openaiResponsesOptions("original-site").reasoning).toEqual({ effort: "medium" });
  });
});
