import { afterEach, describe, expect, it, vi } from "vitest";
import { stripeKeyMatchesDeployment } from "@/lib/env";

describe("stripeKeyMatchesDeployment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("requires a live key on production deployments", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(stripeKeyMatchesDeployment("sk_test_123")).toBe(false);
    expect(stripeKeyMatchesDeployment("sk_live_123")).toBe(true);
    expect(stripeKeyMatchesDeployment("rk_live_123")).toBe(true);
  });

  it("allows test keys outside production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(stripeKeyMatchesDeployment("sk_test_123")).toBe(true);
  });
});
