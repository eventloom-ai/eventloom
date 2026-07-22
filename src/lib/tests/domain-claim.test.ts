import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  serviceSupabase: () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: mocks.maybeSingle,
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    return { from: vi.fn(() => builder), rpc: mocks.rpc };
  },
}));
vi.mock("@/lib/domains/registrant", () => ({ loadRegistrantPayload: () => ({ firstName: "Mira", lastName: "Hadi" }) }));

import { loadLaunchOrderForProvisioning } from "@/lib/payments/fulfillment";

const input = {
  eventId: "10000000-0000-4000-8000-000000000001",
  orderId: "10000000-0000-4000-8000-000000000002",
  versionId: "10000000-0000-4000-8000-000000000003",
  stripeSessionId: "cs_domain_claim",
  amountTotal: 2_000,
  currency: "usd",
  requestedDomain: "mira-adam.com",
};

describe("paid domain claim", () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset().mockResolvedValue({
      data: {
        id: input.orderId,
        event_id: input.eventId,
        status: "pending",
        kind: "event_launch",
        provider: "stripe",
        provider_reference: input.stripeSessionId,
        amount_total: input.amountTotal,
        currency: input.currency,
        site_version_id: input.versionId,
        metadata: { domain: input.requestedDomain },
      },
      error: null,
    });
    mocks.rpc.mockReset().mockResolvedValue({ data: { ok: true }, error: null });
  });

  it("claims the domain for the paid order before external registration", async () => {
    const result = await loadLaunchOrderForProvisioning(input);

    expect(result).toEqual(expect.objectContaining({ ok: true, domain: "mira-adam.com" }));
    expect(mocks.rpc).toHaveBeenCalledWith("claim_domain_fulfillment", {
      p_event_id: input.eventId,
      p_order_id: input.orderId,
      p_domain: "mira-adam.com",
    });
  });

  it("rejects Stripe metadata that disagrees with the server-owned order", async () => {
    const result = await loadLaunchOrderForProvisioning({ ...input, requestedDomain: "other-event.com" });

    expect(result).toEqual({ ok: false, error: "invalid_launch_order" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not proceed when another paid order owns the domain claim", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0001" } });

    const result = await loadLaunchOrderForProvisioning(input);

    expect(result).toEqual({ ok: false, error: "domain_claim_failed" });
  });
});
