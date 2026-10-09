export const TURNSTILE_ACTIONS = {
  creatorSignup: "creator_signup",
  creatorSignin: "creator_signin",
  productFeedback: "product_feedback",
  privacyRequest: "privacy_request",
  publicRsvp: "public_rsvp",
  abuseReport: "abuse_report",
} as const;

export type TurnstileAction =
  (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS];
