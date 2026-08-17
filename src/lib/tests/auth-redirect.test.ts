import { describe, expect, it } from "vitest";
import { loginUrlForProtectedRequest, safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath", () => {
  it("keeps valid internal destinations", () => {
    expect(safeRedirectPath("/app/events/new?brief=garden-wedding")).toBe("/app/events/new?brief=garden-wedding");
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
});
