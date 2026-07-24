import { describe, expect, it } from "vitest";
import { authCallbackRecoveryPath, loginUrlForProtectedRequest, safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath", () => {
  it("keeps valid internal destinations", () => {
    expect(safeRedirectPath("/app/events/new?template=wedding")).toBe("/app/events/new?template=wedding");
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(safeRedirectPath("https://attacker.example")).toBe("/app");
    expect(safeRedirectPath("//attacker.example")).toBe("/app");
    expect(safeRedirectPath("/\\attacker.example")).toBe("/app");
    expect(safeRedirectPath("/%2f%2fattacker.example")).toBe("/app");
  });

  it("preserves a protected route query string only inside the return destination", () => {
    const loginUrl = loginUrlForProtectedRequest(
      new URL("https://eventloom-beta.vercel.app/app?status=published"),
    );

    expect(loginUrl.pathname).toBe("/login");
    expect(loginUrl.searchParams.get("next")).toBe("/app?status=published");
    expect(loginUrl.searchParams.get("status")).toBeNull();
  });

  it("recovers an OAuth code that Supabase sends to the site root", () => {
    expect(authCallbackRecoveryPath({
      code: "oauth-code",
      next: "/app/events/new?brief=Garden%20wedding",
    })).toBe(
      "/auth/callback?code=oauth-code&next=%2Fapp%2Fevents%2Fnew%3Fbrief%3DGarden%2520wedding",
    );
    expect(authCallbackRecoveryPath({ code: "", next: "/app" })).toBeNull();
    expect(authCallbackRecoveryPath({ code: "oauth-code", next: "https://evil.test" }))
      .toBe("/auth/callback?code=oauth-code");
  });
});
