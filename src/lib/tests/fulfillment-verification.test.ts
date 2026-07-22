import { describe, expect, it, vi } from "vitest";
import { verifyLaunchFulfillment } from "@/lib/payments/fulfillment";

const input = {
  eventId: "10000000-0000-4000-8000-000000000001",
  orderId: "10000000-0000-4000-8000-000000000002",
  versionId: "10000000-0000-4000-8000-000000000003",
  stripeSessionId: "cs_launch_1",
};

function clientWith(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
  const results = {
    orders: { data: { status: "paid" }, error: null },
    payments: { data: { status: "paid" }, error: null },
    event_entitlements: {
      data: { status: "active", launch_order_id: input.orderId, expires_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    },
    events: { data: { status: "published", rsvp_open: true, published_version_id: input.versionId }, error: null },
    ...overrides,
  };

  return {
    from: vi.fn((table: keyof typeof results) => {
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue(results[table]),
      };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      return builder;
    }),
  };
}

describe("launch fulfillment postconditions", () => {
  it("confirms the paid order, payment, entitlement, and published event", async () => {
    const client = clientWith();

    await expect(verifyLaunchFulfillment({ ...input, client: client as never })).resolves.toEqual({ ok: true });
    expect(client.from).toHaveBeenCalledWith("orders");
    expect(client.from).toHaveBeenCalledWith("payments");
    expect(client.from).toHaveBeenCalledWith("event_entitlements");
    expect(client.from).toHaveBeenCalledWith("events");
  });

  it("detects a paid Stripe session without a recorded payment", async () => {
    const client = clientWith({ payments: { data: null, error: null } });

    await expect(verifyLaunchFulfillment({ ...input, client: client as never })).resolves.toEqual({
      ok: false,
      error: "payment_not_recorded",
    });
  });

  it("detects a missing or expired entitlement", async () => {
    const client = clientWith({
      event_entitlements: {
        data: { status: "active", launch_order_id: input.orderId, expires_at: "2020-01-01T00:00:00.000Z" },
        error: null,
      },
    });

    await expect(verifyLaunchFulfillment({ ...input, client: client as never })).resolves.toEqual({
      ok: false,
      error: "entitlement_not_active",
    });
  });

  it("detects an event that was not published with RSVP enabled", async () => {
    const client = clientWith({
      events: { data: { status: "draft", rsvp_open: false, published_version_id: null }, error: null },
    });

    await expect(verifyLaunchFulfillment({ ...input, client: client as never })).resolves.toEqual({
      ok: false,
      error: "event_not_published",
    });
  });
});
