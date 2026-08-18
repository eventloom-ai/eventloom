export type PublishErrorPresentation = {
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export function publishErrorPresentation(code: string, eventId: string): PublishErrorPresentation {
  switch (code) {
    case "mfa_required":
      return {
        message: "Finish account security before publishing. Verify your email and set up your authenticator.",
        actionLabel: "Finish account security",
        actionHref: "/app/security",
      };
    case "legal_onboarding_required":
      return {
        message: "Confirm the creator terms once before publishing your first event.",
        actionLabel: "Confirm creator terms",
        actionHref: "/app/legal-acceptance",
      };
    case "event_privacy_notice_required":
    case "event_end_required":
      return {
        message: "Add the event date, timezone, and guest privacy details before publishing.",
        actionLabel: "Complete event details",
        actionHref: `/app/events/${encodeURIComponent(eventId)}/privacy`,
      };
    case "legal_acceptance_required":
      return {
        message: "Review and accept the launch terms above before continuing.",
      };
    case "registrant_invalid":
      return {
        message: "Check every required domain-owner field, then try again.",
      };
    case "invalid_domain":
    case "domain_unavailable":
    case "domain_premium":
    case "domain_unsupported_currency":
    case "domain_over_cap":
    case "domain_check_failed":
      return {
        message: "That domain can’t be registered right now. Check another name or publish with your Eventloom address.",
      };
    case "already_launched":
      return {
        message: "This event is already published. Reload the studio to see its live status.",
      };
    case "site_version_missing":
      return {
        message: "Your draft is not ready to publish yet. Finish creating the site, then try again.",
      };
    case "checkout_unavailable":
      return {
        message: "Secure checkout is temporarily unavailable. Your draft is safe and you can keep editing.",
        actionLabel: "Contact support",
        actionHref: "/contact",
      };
    case "unauthorized":
      return {
        message: "Your sign-in expired. Sign in again to continue with this event.",
        actionLabel: "Sign in again",
        actionHref: `/login?next=${encodeURIComponent(`/app/events/${eventId}/studio`)}`,
      };
    case "not_found":
      return {
        message: "We couldn’t find an event you can publish. Return to your events and open it again.",
        actionLabel: "Go to my events",
        actionHref: "/app",
      };
    case "renewal_not_available":
      return {
        message: "This event needs a renewal instead of a new launch. Contact support and we’ll help.",
        actionLabel: "Contact support",
        actionHref: "/contact",
      };
    case "publish_failed":
      return {
        message: "Publishing didn’t finish, but your draft is safe. Please try again.",
      };
    default:
      return {
        message: "We couldn’t start secure checkout. Your draft is safe. Please try again in a moment.",
        actionLabel: "Contact support",
        actionHref: "/contact",
      };
  }
}
