import { describe, expect, it } from "vitest";
import { publishErrorPresentation } from "@/lib/publish-errors";

describe("publish error guidance", () => {
  const eventId = "10000000-0000-4000-8000-000000000001";

  it("guides creators to finish account security", () => {
    expect(publishErrorPresentation("mfa_required", eventId)).toEqual({
      message: "Finish account security before publishing. Verify your email and set up your authenticator.",
      actionLabel: "Finish account security",
      actionHref: "/app/security",
    });
  });

  it("guides creators to the exact event privacy setup", () => {
    const result = publishErrorPresentation("event_privacy_notice_required", eventId);

    expect(result.message).not.toContain("event_privacy_notice_required");
    expect(result.actionHref).toBe(`/app/events/${eventId}/privacy`);
  });

  it("never exposes an unknown internal error code", () => {
    const result = publishErrorPresentation("order_create_failed", eventId);

    expect(result.message).not.toContain("order_create_failed");
    expect(result.actionHref).toBe("/contact");
  });

  it("preserves the intended studio path when sign-in expires", () => {
    expect(publishErrorPresentation("unauthorized", eventId).actionHref).toBe(
      `/login?next=${encodeURIComponent(`/app/events/${eventId}/studio`)}`,
    );
  });
});
