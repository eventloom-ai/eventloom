import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: null as unknown,
  event: null as unknown,
  entitlement: null as unknown,
  orderInsertError: null as unknown,
  orderUpdateError: null as unknown,
  insertedOrder: null as unknown,
  updatedOrder: null as unknown,
  sessionCreate: vi.fn(),
  sessionExpire: vi.fn(),
  domainCheck: vi.fn(),
  storeRegistrant: vi.fn(),
  deleteRegistrant: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: vi.fn(function StripeMock() {
    return {
      checkout: {
        sessions: { create: mocks.sessionCreate, expire: mocks.sessionExpire },
      },
    };
  }),
}));

vi.mock("@/lib/env", () => ({
  appUrl: () => "https://eventloom-beta.vercel.app",
  domainPriceCapUsd: () => 15,
  env: { stripeSecretKey: () => "sk_test_checkout" },
  isDomainPurchasingConfigured: () => true,
}));

vi.mock("@/lib/domains/provider", () => ({
  domainProvider: () => ({ check: mocks.domainCheck }),
}));
vi.mock("@/lib/domains/registrant", async () => {
  const { z } = await import("zod");
  return {
    domainRegistrantSchema: z.object({ firstName: z.string(), lastName: z.string(), organization: z.string(), email: z.string(), phone: z.string(), address1: z.string(), address2: z.string(), city: z.string(), state: z.string(), postalCode: z.string(), country: z.enum(["CA", "US"]) }),
    storeRegistrantPayload: mocks.storeRegistrant,
    deleteRegistrantPayload: mocks.deleteRegistrant,
  };
});

vi.mock("@/lib/payments/billing", () => ({
  LAUNCH_PRICE_CENTS: 2_000,
}));

vi.mock("@/lib/supabase/server", () => ({
  serviceSupabase: () => mocks.client,
}));

import { createLaunchCheckoutSession } from "@/lib/payments/stripe";

const eventId = "10000000-0000-4000-8000-000000000001";
const ownerId = "10000000-0000-4000-8000-000000000010";
const versionId = "10000000-0000-4000-8000-000000000003";
const orderId = "10000000-0000-4000-8000-000000000002";

function createClient() {
  return {
    from: vi.fn((table: string) => {
      let operation = "select";
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn(),
        insert: vi.fn(),
        single: vi.fn(),
        update: vi.fn(), delete: vi.fn(), in: vi.fn(),
      };
      builder.select.mockImplementation(() => builder);
      builder.in.mockImplementation((_column, values: string[]) => Promise.resolve({ data: values.map((document_key) => ({ id: `doc-${document_key}`, document_key, version: "2026-07-24-beta" })), error: null }));
      builder.delete.mockReturnValue(builder);
      builder.eq.mockImplementation(() => operation === "update"
        ? Promise.resolve({ error: mocks.orderUpdateError })
        : builder);
      builder.maybeSingle.mockResolvedValue({
        data: table === "events" ? mocks.event : mocks.entitlement,
        error: null,
      });
      builder.insert.mockImplementation((value) => {
        operation = "insert";
        if (table === "orders") mocks.insertedOrder = value;
        return builder;
      });
      builder.single.mockResolvedValue({
        data: mocks.orderInsertError ? null : { id: orderId },
        error: mocks.orderInsertError,
      });
      builder.update.mockImplementation((value) => {
        operation = "update";
        mocks.updatedOrder = value;
        return builder;
      });
      return builder;
    }),
  };
}

describe("Stripe launch checkout", () => {
  beforeEach(() => {
    mocks.event = { id: eventId, owner_id: ownerId, organization_id: "org_1", slug: "mira-adam", draft_version_id: versionId };
    mocks.entitlement = null;
    mocks.orderInsertError = null;
    mocks.orderUpdateError = null;
    mocks.insertedOrder = null;
    mocks.updatedOrder = null;
    mocks.client = createClient();
    mocks.sessionCreate.mockReset().mockResolvedValue({ id: "cs_launch_1", url: "https://checkout.stripe.test/cs_launch_1" });
    mocks.sessionExpire.mockReset().mockResolvedValue({});
    mocks.domainCheck.mockReset().mockResolvedValue([]);
    mocks.storeRegistrant.mockReset().mockResolvedValue(true);
    mocks.deleteRegistrant.mockReset().mockResolvedValue(undefined);
  });

  const acceptance = { version: "2026-07-24-beta", ipHash: "hash", userAgentClass: "desktop" };
  const registrant = { firstName: "Mira", lastName: "Hadi", organization: "", email: "mira@example.com", phone: "+14165550123", address1: "1 King St", address2: "", city: "Toronto", state: "ON", postalCode: "M5V1A1", country: "CA" as const };

  it("creates a server-owned order and matching one-time Checkout Session", async () => {
    const result = await createLaunchCheckoutSession({ eventId, ownerId, customerEmail: "owner@example.com", acceptance });

    expect(result).toEqual({ ok: true, id: "cs_launch_1", url: "https://checkout.stripe.test/cs_launch_1" });
    expect(mocks.insertedOrder).toMatchObject({
      event_id: eventId,
      status: "pending",
      kind: "event_launch",
      amount_total: 2_000,
      currency: "usd",
      provider: "stripe",
      site_version_id: versionId,
      metadata: { product: "eventloom_launch", term_months: 12 },
    });
    expect(mocks.sessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: "payment",
      customer_email: "owner@example.com",
      client_reference_id: orderId,
      success_url: `${"https://eventloom-beta.vercel.app"}/app/events/${eventId}/studio?checkout=success`,
      cancel_url: `${"https://eventloom-beta.vercel.app"}/app/events/${eventId}/studio?checkout=cancelled`,
      metadata: expect.objectContaining({ event_id: eventId, order_id: orderId, version_id: versionId }),
    }));
    expect(mocks.updatedOrder).toMatchObject({ provider_reference: "cs_launch_1" });
  });

  it("includes an authoritative custom-domain quote in the order and Stripe metadata", async () => {
    mocks.domainCheck.mockResolvedValue([{
      domain: "mira-adam.com",
      available: true,
      premium: false,
      currency: "USD",
      registrationCost: 12,
      renewalCost: 12,
    }]);

    await expect(createLaunchCheckoutSession({ eventId, ownerId, domain: "MIRA-ADAM.COM", registrant, acceptance })).resolves.toMatchObject({ ok: true });

    expect(mocks.domainCheck).toHaveBeenCalledWith(["mira-adam.com"]);
    expect(mocks.insertedOrder).toMatchObject({
      metadata: {
        domain: "mira-adam.com",
        domain_registration_cost: 12,
        domain_renewal_cost: 12,
        domain_currency: "USD",
      },
    });
    expect(mocks.sessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      line_items: expect.arrayContaining([expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 1_200 }) })]),
      metadata: expect.objectContaining({ domain: "mira-adam.com" }),
      payment_intent_data: { metadata: expect.objectContaining({ domain: "mira-adam.com" }) },
    }));
  });

  it("does not create another checkout for an active entitlement", async () => {
    mocks.entitlement = { launch_order_id: orderId, status: "active", expires_at: "2099-01-01T00:00:00.000Z" };

    await expect(createLaunchCheckoutSession({ eventId, ownerId, acceptance })).resolves.toEqual({ ok: false, error: "already_launched" });
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.insertedOrder).toBeNull();
  });

  it("requires a draft site version before taking payment", async () => {
    mocks.event = { ...(mocks.event as object), draft_version_id: null };

    await expect(createLaunchCheckoutSession({ eventId, ownerId, acceptance })).resolves.toEqual({ ok: false, error: "site_version_missing" });
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("expires Stripe Checkout when its session id cannot be stored on the order", async () => {
    mocks.orderUpdateError = { code: "database_error" };

    await expect(createLaunchCheckoutSession({ eventId, ownerId, acceptance })).resolves.toEqual({ ok: false, error: "order_update_failed" });
    expect(mocks.sessionExpire).toHaveBeenCalledWith("cs_launch_1");
  });
});
