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

import { domainProvisioningStore, provisionPurchasedDomain, type DomainProvisioningStore, type ProvisionedDomain } from "@/lib/domains/provision";

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

  it("does not re-apply the price cap after payment, but holds an anomalous price for review", async () => {
    mocks.check.mockResolvedValue([{ ...quote, registrationCost: 16 }]);
    await expect(provisionPurchasedDomain("mira-adam.com", registrant)).resolves.toMatchObject({ ok: true, provisioned: { registrationCost: 16 } });

    mocks.register.mockClear();
    mocks.check.mockResolvedValue([{ ...quote, registrationCost: 31 }]);
    await expect(provisionPurchasedDomain("mira-adam.com", registrant)).resolves.toEqual({ ok: false, error: "domain_price_anomaly" });
    mocks.check.mockResolvedValue([{ ...quote, premium: true }]);
    await expect(provisionPurchasedDomain("mira-adam.com", registrant)).resolves.toEqual({ ok: false, error: "domain_premium" });
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("does not attach a domain when registration is still pending", async () => {
    mocks.register.mockResolvedValue({ ok: false, error: "opensrs_registration_pending" });

    await expect(provisionPurchasedDomain("mira-adam.com", registrant)).resolves.toEqual({ ok: false, error: "opensrs_registration_pending" });
    expect(mocks.addToVercel).not.toHaveBeenCalled();
  });

  it("resumes a retry after the registration step instead of re-checking or buying the domain twice", async () => {
    let saved: ProvisionedDomain | null = null;
    const store: DomainProvisioningStore = { loadRegistration: async () => saved, recordRegistration: vi.fn(async (registration) => { saved = registration; return true; }) };
    mocks.addToVercel.mockResolvedValueOnce({ ok: false, error: "vercel_domain_failed_500" });

    await expect(provisionPurchasedDomain("mira-adam.com", registrant, store)).resolves.toEqual({ ok: false, error: "vercel_domain_failed_500" });
    expect(store.recordRegistration).toHaveBeenCalledWith({ domain: "mira-adam.com", providerId: "mira-adam.com", registrationCost: 12, renewalCost: 12 });

    // The domain is ours now: availability would read as taken and the price may have moved.
    mocks.check.mockResolvedValue([{ ...quote, available: false, registrationCost: 40 }]);
    await expect(provisionPurchasedDomain("mira-adam.com", registrant, store)).resolves.toEqual({ ok: true, provisioned: { domain: "mira-adam.com", providerId: "mira-adam.com", registrationCost: 12, renewalCost: 12 } });
    expect(mocks.check).toHaveBeenCalledTimes(1);
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(mocks.ensureVercelDns).toHaveBeenCalledTimes(1);
  });

  it("stops without registering when saved progress cannot be read, and continues when it cannot be written", async () => {
    const unreadable: DomainProvisioningStore = { loadRegistration: async () => { throw new Error("domain_state_unavailable"); }, recordRegistration: vi.fn() };
    await expect(provisionPurchasedDomain("mira-adam.com", registrant, unreadable)).resolves.toEqual({ ok: false, error: "domain_state_unavailable" });
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unwritable: DomainProvisioningStore = { loadRegistration: async () => null, recordRegistration: async () => false };
    await expect(provisionPurchasedDomain("mira-adam.com", registrant, unwritable)).resolves.toMatchObject({ ok: true });
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("domain_registration_record_failed"));
    consoleError.mockRestore();
  });

  it("persists progress on the order's claimed domains row", async () => {
    const calls: Array<[string, unknown[]]> = [];
    let row: Record<string, unknown> | null = { provider_id: "dom-1", registration_cost_usd: "12.00", renewal_cost_usd: 14 };
    const builder: Record<string, (...args: unknown[]) => unknown> = {};
    for (const method of ["select", "update", "eq"]) builder[method] = (...args: unknown[]) => { calls.push([method, args]); return builder; };
    builder.maybeSingle = async () => ({ data: row, error: null });
    builder.then = (resolve: unknown) => (resolve as (value: unknown) => void)({ error: null });
    const store = domainProvisioningStore({ from: () => builder } as never, "order-1", "mira-adam.com");

    await expect(store.loadRegistration()).resolves.toEqual({ domain: "mira-adam.com", providerId: "dom-1", registrationCost: 12, renewalCost: 14 });
    row = { provider_id: "dom-1", registration_cost_usd: null, renewal_cost_usd: null };
    await expect(store.loadRegistration()).rejects.toThrow("domain_state_incomplete");
    row = null;
    await expect(store.loadRegistration()).resolves.toBeNull();

    await expect(store.recordRegistration({ domain: "mira-adam.com", providerId: "dom-2", registrationCost: 12, renewalCost: 12 })).resolves.toBe(true);
    expect(calls).toContainEqual(["update", [expect.objectContaining({ status: "registered", provider_id: "dom-2", registration_cost_usd: 12 })]]);
    expect(calls.filter(([method]) => method === "eq").map(([, args]) => args)).toContainEqual(["order_id", "order-1"]);
  });
});
