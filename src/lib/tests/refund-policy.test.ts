import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { legalDocument, legalDocumentCanonicalText } from "@/lib/legal-documents";
import { REFUND_RSVP_LIMIT, REFUND_WINDOW_DAYS, SERVICE_FAILURE_FIX_HOURS, launchRefundEligibility } from "@/lib/payments/refund-policy";

const day = 24 * 60 * 60 * 1000;
const paidAt = new Date("2026-10-01T12:00:00Z");
const eventEndsAt = new Date("2026-12-01T23:00:00Z");

describe("launch refund rule", () => {
  it("refunds a lightly used page within the window before the event", () => {
    expect(launchRefundEligibility({ paidAt, eventEndsAt, rsvpCount: REFUND_RSVP_LIMIT - 1, now: new Date(paidAt.getTime() + REFUND_WINDOW_DAYS * day) })).toEqual({ eligible: true, basis: "cooling_off" });
  });

  it("stops at the RSVP limit, the end of the window, and the end of the event", () => {
    expect(launchRefundEligibility({ paidAt, eventEndsAt, rsvpCount: REFUND_RSVP_LIMIT, now: new Date(paidAt.getTime() + day) })).toEqual({ eligible: false, reason: "used_for_guests" });
    expect(launchRefundEligibility({ paidAt, eventEndsAt, rsvpCount: 0, now: new Date(paidAt.getTime() + REFUND_WINDOW_DAYS * day + 1) })).toEqual({ eligible: false, reason: "window_passed" });
    expect(launchRefundEligibility({ paidAt, eventEndsAt: new Date(paidAt.getTime() + 2 * day), rsvpCount: 0, now: new Date(paidAt.getTime() + 3 * day) })).toEqual({ eligible: false, reason: "event_ended" });
  });

  it("refunds unresolved service failures until the event ends, whatever the usage", () => {
    expect(launchRefundEligibility({ paidAt, eventEndsAt, rsvpCount: 80, serviceFailureUnresolved: true, now: new Date(paidAt.getTime() + 40 * day) })).toEqual({ eligible: true, basis: "service_failure" });
    expect(launchRefundEligibility({ paidAt, eventEndsAt, rsvpCount: 80, serviceFailureUnresolved: true, now: new Date(eventEndsAt.getTime() + day) })).toEqual({ eligible: false, reason: "event_ended" });
  });

  it("never refunds pages suspended for violations, but always refunds mistaken charges", () => {
    expect(launchRefundEligibility({ paidAt, eventEndsAt, rsvpCount: 0, suspendedForViolation: true, now: new Date(paidAt.getTime() + day) })).toEqual({ eligible: false, reason: "suspended_for_violation" });
    expect(launchRefundEligibility({ paidAt, eventEndsAt, rsvpCount: 50, duplicateCharge: true, now: new Date(eventEndsAt.getTime() + day) })).toEqual({ eligible: true, basis: "duplicate_charge" });
  });

  it("is the rule the published policy states", () => {
    const text = legalDocumentCanonicalText(legalDocument("refunds")!);
    expect(text).toContain(`within ${REFUND_WINDOW_DAYS} days of payment if fewer than ${REFUND_RSVP_LIMIT} RSVPs`);
    expect(text).toContain(`within ${SERVICE_FAILURE_FIX_HOURS} hours`);
    expect(text).toMatch(/No refunds after your event has ended/);
    expect(text).toMatch(/unpublished as soon as the refund is processed/);
  });

  it("matches what a full Stripe refund does in the database", () => {
    // charge.refunded → record_stripe_refund: a full refund revokes the entitlement and archives the event, so the page
    // goes offline and RSVPs close. The policy promises exactly that, and only offers full refunds because partial
    // refunds change nothing.
    const sql = readFileSync(path.resolve(__dirname, "../../../supabase/migrations/20260722054230_atomic_stripe_refunds.sql"), "utf8");
    expect(sql).toContain("update public.event_entitlements set status = 'revoked'");
    expect(sql).toContain("update public.events set status = 'archived', rsvp_open = false");
    expect(legalDocumentCanonicalText(legalDocument("refunds")!)).toContain("always full refunds");
    // A refunded event keeps launch_order_id on its entitlement, and checkout refuses events that have one.
    const checkout = readFileSync(path.resolve(__dirname, "../payments/stripe.ts"), "utf8");
    expect(checkout).toContain('if (entitlement?.launch_order_id)');
    expect(legalDocumentCanonicalText(legalDocument("refunds")!)).toContain("A refunded event can't be published again");
  });
});
