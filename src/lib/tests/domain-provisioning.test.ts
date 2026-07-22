import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  register: vi.fn(),
  ensureVercelDns: vi.fn(),
  addToVercel: vi.fn(),
}));

vi.mock("@/lib/domains/provider", () => ({
  domainProvider: () => ({
    check: mocks.check,
    register: mocks.register,
    ensureVercelDns: mocks.ensureVercelDns,
  }),
}));

vi.mock("@/lib/domains/vercel", () => ({
  addDomainToVercelProject: mocks.addToVercel,
}));

vi.mock("@/lib/env", () => ({
  domainPriceCapUsd: () => 15,
}));

import { provisionPurchasedDomain } from "@/lib/domains/provision";

const quote = {
  domain: "mira-adam.com",
  available: true,
  premium: false,
  currency: "USD",
  registrationCost: 12,
  renewalCost: 12,
};
const registrant = { firstName: "Mira", lastName: "Hadi", organization: "", email: "mira@example.com", phone: "+14165550123", address1: "1 King St", address2: "", city: "Toronto", state: "ON", postalCode: "M5V 1A1", country: "CA" as const };

describe("paid domain provisioning", () => {
  beforeEach(() => {
    mocks.check.mockReset().mockResolvedValue([quote]);
    mocks.register.mockReset().mockResolvedValue({ ok: true, providerId: "mira-adam.com" });
    mocks.addToVercel.mockReset().mockResolvedValue({ ok: true, ipv4: "76.76.21.21" });
    mocks.ensureVercelDns.mockReset().mockResolvedValue({ ok: true });
  });

  it("checks price, registers, attaches, and routes the domain in order", async () => {
    await expect(provisionPurchasedDomain("mira-adam.com", registrant)).resolves.toEqual({
      ok: true,
      provisioned: {
        domain: "mira-adam.com",
        providerId: "mira-adam.com",
        registrationCost: 12,
        renewalCost: 12,
      },
    });

    expect(mocks.register).toHaveBeenCalledWith("mira-adam.com", registrant);
    expect(mocks.addToVercel).toHaveBeenCalledWith("mira-adam.com");
    expect(mocks.ensureVercelDns).toHaveBeenCalledWith("mira-adam.com", "76.76.21.21");
    expect(mocks.check.mock.invocationCallOrder[0]).toBeLessThan(mocks.register.mock.invocationCallOrder[0]);
    expect(mocks.register.mock.invocationCallOrder[0]).toBeLessThan(mocks.addToVercel.mock.invocationCallOrder[0]);
    expect(mocks.addToVercel.mock.invocationCallOrder[0]).toBeLessThan(mocks.ensureVercelDns.mock.invocationCallOrder[0]);
  });

  it("does not register a domain whose fresh price exceeds the allowance", async () => {
    mocks.check.mockResolvedValue([{ ...quote, registrationCost: 16 }]);

    await expect(provisionPurchasedDomain("mira-adam.com", registrant)).resolves.toEqual({ ok: false, error: "domain_over_cap" });
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.addToVercel).not.toHaveBeenCalled();
  });

  it("does not attach a domain when registration is still pending", async () => {
    mocks.register.mockResolvedValue({ ok: false, error: "opensrs_registration_pending" });

    await expect(provisionPurchasedDomain("mira-adam.com", registrant)).resolves.toEqual({ ok: false, error: "opensrs_registration_pending" });
    expect(mocks.addToVercel).not.toHaveBeenCalled();
  });
});
