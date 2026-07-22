import { afterEach, describe, expect, it, vi } from "vitest";
import { logPaymentEvent } from "@/lib/payments/monitoring";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("payment structured logging", () => {
  it("emits machine-queryable error events without losing fulfillment context", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logPaymentEvent("error", "launch_fulfillment_failed", {
      eventId: "event_1",
      orderId: "order_1",
      errorCode: "P0001",
      durationMs: 42,
    });

    expect(consoleError).toHaveBeenCalledOnce();
    const payload = JSON.parse(consoleError.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: "error",
      service: "payments",
      event: "launch_fulfillment_failed",
      eventId: "event_1",
      orderId: "order_1",
      errorCode: "P0001",
      durationMs: 42,
    });
    expect(payload.timestamp).toEqual(expect.any(String));
  });
});
