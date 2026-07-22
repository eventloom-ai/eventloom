import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/env", () => ({ env: { ipHashSecret: () => "ip-test-secret" } }));

import { clientIpHash, isSameOriginMutation, requestWithinLimit, safeTokenEquals } from "@/lib/security/request";

describe("request boundary controls", () => {
  it("accepts same-origin mutations and rejects cross-origin requests", () => {
    const accepted = new NextRequest("https://eventloom.test/api/action", { headers: { host: "eventloom.test", origin: "https://eventloom.test" } });
    const rejected = new NextRequest("https://eventloom.test/api/action", { headers: { host: "eventloom.test", origin: "https://attacker.test" } });
    expect(isSameOriginMutation(accepted)).toBe(true);
    expect(isSameOriginMutation(rejected)).toBe(false);
  });

  it("enforces declared request-size limits", () => {
    expect(requestWithinLimit(new NextRequest("https://eventloom.test", { headers: { "content-length": "1024" } }), 1024)).toBe(true);
    expect(requestWithinLimit(new NextRequest("https://eventloom.test", { headers: { "content-length": "1025" } }), 1024)).toBe(false);
  });

  it("compares monitoring secrets without accepting prefixes", () => {
    expect(safeTokenEquals("secret", "secret")).toBe(true);
    expect(safeTokenEquals("secret", "secret-longer")).toBe(false);
  });

  it("stores a keyed IP hash rather than a raw address", () => {
    const hash = clientIpHash(new NextRequest("https://eventloom.test", { headers: { "x-forwarded-for": "203.0.113.2, 10.0.0.1" } }));
    expect(hash).toBeTruthy();
    expect(hash).not.toContain("203.0.113.2");
  });
});
