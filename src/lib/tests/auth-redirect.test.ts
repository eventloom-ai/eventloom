import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth/redirect";

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
});
