export const TURNSTILE_ACTIONS = {
  creatorSignup: "creator_signup",
  productFeedback: "product_feedback",
  privacyRequest: "privacy_request",
  publicRsvp: "public_rsvp",
} as const;

export type TurnstileAction =
  (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS];
