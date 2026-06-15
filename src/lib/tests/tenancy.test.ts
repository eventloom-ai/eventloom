import { describe, expect, it } from "vitest";
import { normalizeHost, slugFromHost } from "@/lib/tenancy";

describe("tenant host resolution", () => {
  it("extracts tenant subdomains from the root domain", () => {
    expect(slugFromHost("mira-adam.eventloom.ai", "eventloom.ai")).toBe("mira-adam");
  });

  it("treats custom domains as host tenants", () => {
    expect(slugFromHost("miraadam.com", "eventloom.ai")).toBe("miraadam.com");
  });

  it("ignores root and local hosts", () => {
    expect(slugFromHost("eventloom.ai", "eventloom.ai")).toBeNull();
    expect(slugFromHost("localhost:3000", "eventloom.ai")).toBeNull();
  });

  it("normalizes host ports", () => {
    expect(normalizeHost("Mira-Adam.Eventloom.AI:443")).toBe("mira-adam.eventloom.ai");
  });
});
