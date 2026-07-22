import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  rpc: vi.fn(),
  loadLaunchOrder: vi.fn(),
  verifyFulfillment: vi.fn(),
  provisionDomain: vi.fn(),
  logPaymentEvent: vi.fn(),
  stripeConfigured: true,
  storageConfigured: true,
  webhookSecret: "whsec_test",
  deleteRegistrant: vi.fn(),
  beginProviderEvent: vi.fn(),
  startFulfillmentJob: vi.fn(),
  markFulfillment: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    stripeWebhookSecret: () => mocks.webhookSecret,
  },
}));

vi.mock("@/lib/payments/stripe", () => ({
  stripeClient: () => mocks.stripeConfigured
    ? { webhooks: { constructEvent: mocks.constructEvent } }
    : null,
}));

vi.mock("@/lib/payments/billing", () => ({
  AI_LAUNCH_BONUS_CENTS: 500,
  LAUNCH_PRICE_CENTS: 2_000,
}));

vi.mock("@/lib/payments/fulfillment", () => ({
  loadLaunchOrderForProvisioning: mocks.loadLaunchOrder,
  verifyLaunchFulfillment: mocks.verifyFulfillment,
}));

vi.mock("@/lib/payments/monitoring", () => ({
  logPaymentEvent: mocks.logPaymentEvent,
}));

vi.mock("@/lib/domains/provision", () => ({
  provisionPurchasedDomain: mocks.provisionDomain,
}));
vi.mock("@/lib/domains/registrant", () => ({ deleteRegistrantPayload: mocks.deleteRegistrant }));
vi.mock("@/lib/payments/webhook-store", () => ({ beginProviderEvent: mocks.beginProviderEvent, startFulfillmentJob: mocks.startFulfillmentJob, markFulfillment: mocks.markFulfillment }));

import { POST } from "@/app/api/stripe/webhook/route";

function checkoutEvent() {
  return {
    id: "evt_launch_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_launch_1",
        client_reference_id: "10000000-0000-4000-8000-000000000002",
        amount_total: 2_000,
        currency: "usd",
        payment_status: "paid",
        payment_intent: "pi_launch_1",
        metadata: {
          product: "eventloom_launch",
          event_id: "10000000-0000-4000-8000-000000000001",
          order_id: "10000000-0000-4000-8000-000000000002",
          version_id: "10000000-0000-4000-8000-000000000003",
          domain: undefined as string | undefined,
        },
      },
    },
  };
}

function webhookRequest() {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "test_signature" },
    body: "raw-stripe-body",
  });
}

describe("Stripe launch webhook", () => {
  beforeEach(() => {
    mocks.constructEvent.mockReset();
    mocks.rpc.mockReset();
    mocks.loadLaunchOrder.mockReset();
    mocks.verifyFulfillment.mockReset().mockResolvedValue({ ok: true });
    mocks.provisionDomain.mockReset();
    mocks.deleteRegistrant.mockReset().mockResolvedValue(undefined);
    mocks.beginProviderEvent.mockReset().mockResolvedValue({ ok: true, duplicate: false, eventRowId: "webhook-row", client: { rpc: mocks.rpc } });
    mocks.startFulfillmentJob.mockReset().mockResolvedValue("job-row");
    mocks.markFulfillment.mockReset().mockResolvedValue(true);
    mocks.logPaymentEvent.mockReset();
    mocks.stripeConfigured = true;
    mocks.storageConfigured = true;
    mocks.webhookSecret = "whsec_test";
    mocks.constructEvent.mockReturnValue(checkoutEvent());
    mocks.rpc.mockResolvedValue({ data: { ok: true, duplicate: false }, error: null });
    mocks.loadLaunchOrder.mockImplementation(async () => mocks.storageConfigured
      ? { ok: true, client: { rpc: mocks.rpc }, domain: null, registrant: null }
      : { ok: false, error: "storage_not_configured" });
    mocks.provisionDomain.mockResolvedValue({
      ok: true,
      provisioned: { domain: "mira-adam.com", providerId: "mira-adam.com", registrationCost: 12, renewalCost: 12 },
    });
  });

  it("fulfills a paid launch through one atomic RPC", async () => {
    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, duplicate: false });
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("fulfill_event_launch", {
      p_event_id: "10000000-0000-4000-8000-000000000001",
      p_order_id: "10000000-0000-4000-8000-000000000002",
      p_version_id: "10000000-0000-4000-8000-000000000003",
      p_stripe_session_id: "cs_launch_1",
      p_stripe_event_id: "evt_launch_1",
      p_payment_intent_id: "pi_launch_1",
      p_amount_total: 2_000,
      p_currency: "usd",
      p_ai_bonus_cents: 500,
      p_domain: null,
      p_domain_provider_id: null,
      p_domain_registration_cost: null,
      p_domain_renewal_cost: null,
    });
    expect(mocks.verifyFulfillment).toHaveBeenCalledWith({
      client: { rpc: mocks.rpc },
      eventId: "10000000-0000-4000-8000-000000000001",
      orderId: "10000000-0000-4000-8000-000000000002",
      versionId: "10000000-0000-4000-8000-000000000003",
      stripeSessionId: "cs_launch_1",
    });
  });

  it("registers and routes a purchased domain before publishing the paid site", async () => {
    const event = checkoutEvent();
    event.data.object.metadata.domain = "mira-adam.com";
    mocks.constructEvent.mockReturnValue(event);
    mocks.loadLaunchOrder.mockResolvedValue({ ok: true, client: { rpc: mocks.rpc }, domain: "mira-adam.com", registrant: { firstName: "Mira" } });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.provisionDomain).toHaveBeenCalledWith("mira-adam.com", { firstName: "Mira" });
    expect(mocks.rpc).toHaveBeenCalledWith("fulfill_event_launch", expect.objectContaining({
      p_domain: "mira-adam.com",
      p_domain_provider_id: "mira-adam.com",
      p_domain_registration_cost: 12,
      p_domain_renewal_cost: 12,
    }));
    expect(mocks.provisionDomain.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[0]);
  });

  it("returns a retryable error when paid-domain provisioning is incomplete", async () => {
    const event = checkoutEvent();
    event.data.object.metadata.domain = "mira-adam.com";
    mocks.constructEvent.mockReturnValue(event);
    mocks.loadLaunchOrder.mockResolvedValue({ ok: true, client: { rpc: mocks.rpc }, domain: "mira-adam.com", registrant: { firstName: "Mira" } });
    mocks.provisionDomain.mockResolvedValue({ ok: false, error: "cloudflare_registration_pending" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "domain_provisioning_failed" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("acknowledges an idempotent duplicate only after the RPC succeeds", async () => {
    mocks.rpc.mockResolvedValue({ data: { ok: true, duplicate: true }, error: null });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, duplicate: true });
  });

  it("returns a retryable error when atomic fulfillment fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0001" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "fulfillment_failed" });
    expect(mocks.verifyFulfillment).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not acknowledge Stripe until entitlement and publishing postconditions are visible", async () => {
    mocks.verifyFulfillment.mockResolvedValue({ ok: false, error: "entitlement_not_active" });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "fulfillment_verification_failed" });
    expect(mocks.logPaymentEvent).toHaveBeenCalledWith("error", "launch_fulfillment_postcondition_failed", expect.objectContaining({
      error: "entitlement_not_active",
      orderId: "10000000-0000-4000-8000-000000000002",
    }));
  });

  it("does not acknowledge a payment when storage is unavailable", async () => {
    mocks.storageConfigured = false;

    const response = await POST(webhookRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "storage_not_configured" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects a session whose amount does not match the server-owned price", async () => {
    const event = checkoutEvent();
    event.data.object.amount_total = 1;
    mocks.constructEvent.mockReturnValue(event);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("records a full Stripe refund atomically before acknowledging it", async () => {
    mocks.constructEvent.mockReturnValue({ id: "evt_refund_1", type: "charge.refunded", data: { object: { id: "ch_1", payment_intent: "pi_launch_1", amount: 2_000, amount_refunded: 2_000 } } });
    mocks.rpc.mockResolvedValue({ data: { ok: true, full_refund: true }, error: null });
    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("record_stripe_refund", { p_payment_intent_id: "pi_launch_1", p_charge_id: "ch_1", p_amount: 2_000, p_amount_refunded: 2_000 });
    expect(mocks.markFulfillment).toHaveBeenCalledWith({ eventRowId: "webhook-row", state: "service_active" });
  });

  it("safely records an out-of-order irrelevant event as processed", async () => {
    mocks.constructEvent.mockReturnValue({ id: "evt_unrelated", type: "customer.updated", data: { object: {} } });
    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.markFulfillment).toHaveBeenCalledWith({ eventRowId: "webhook-row", state: "service_active" });
  });
});
