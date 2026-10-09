// The launch-fee refund rule published at /legal/refunds. The policy text interpolates these constants,
// so changing a number here changes the document (and its content hash), which forces a new LEGAL_VERSION.
//
// Refunds are issued by hand in the Stripe Dashboard. Stripe then sends charge.refunded, and
// record_stripe_refund() marks a FULL refund: order refunded, entitlement revoked, event archived, RSVPs
// closed. Partial refunds change nothing in the app, so the policy only offers full refunds.

export const REFUND_WINDOW_DAYS = 14;
/** "Used for guests" means this many RSVP form submissions or more (each submission counts once, whatever its party size). */
export const REFUND_RSVP_LIMIT = 5;
/** A fault on our side that we can't fix within this many hours of being told qualifies for a refund at any time before the event ends. */
export const SERVICE_FAILURE_FIX_HOURS = 72;
export const REFUND_RESPONSE_BUSINESS_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RefundDecision =
  | { eligible: true; basis: "cooling_off" | "service_failure" | "duplicate_charge" }
  | { eligible: false; reason: "event_ended" | "window_passed" | "used_for_guests" | "suspended_for_violation" };

export function launchRefundEligibility(input: {
  paidAt: Date;
  /** events.event_ends_at — publishing requires it. */
  eventEndsAt: Date | null;
  /** Count of rsvp_submissions for the event. */
  rsvpCount: number;
  now?: Date;
  serviceFailureUnresolved?: boolean;
  duplicateCharge?: boolean;
  suspendedForViolation?: boolean;
}): RefundDecision {
  const now = input.now ?? new Date();
  if (input.duplicateCharge) return { eligible: true, basis: "duplicate_charge" };
  if (input.suspendedForViolation) return { eligible: false, reason: "suspended_for_violation" };
  if (input.eventEndsAt && input.eventEndsAt.getTime() <= now.getTime()) return { eligible: false, reason: "event_ended" };
  if (input.serviceFailureUnresolved) return { eligible: true, basis: "service_failure" };
  if (now.getTime() - input.paidAt.getTime() > REFUND_WINDOW_DAYS * DAY_MS) return { eligible: false, reason: "window_passed" };
  if (input.rsvpCount >= REFUND_RSVP_LIMIT) return { eligible: false, reason: "used_for_guests" };
  return { eligible: true, basis: "cooling_off" };
}
