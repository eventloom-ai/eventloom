/** Where a guest-to-host referral came from: the page footer or the card shown after a guest replies. */
export type GuestReferralSource = "guest_page" | "guest_rsvp";

/**
 * Absolute link to the Eventloom homepage, tagged with the event that referred the visitor. Absolute because guest
 * pages also run on subdomains and custom domains, where a relative "/" would route back into the event site.
 */
/**
 * Link for the card a guest sees after replying. Only a published event gets one: a host previewing their own draft
 * (or a demo-mode draft) never sees an ad for the product they are already using.
 */
export function rsvpGrowthHref(event: { slug: string; status: string }, appUrl: string) {
  return event.status === "published" ? guestReferralUrl(appUrl, "guest_rsvp", event.slug) : undefined;
}

export function guestReferralUrl(appUrl: string, source: GuestReferralSource, slug: string) {
  const base = appUrl.replace(/\/+$/, "");
  return `${base}/?utm_source=${source}&utm_medium=referral&utm_campaign=${encodeURIComponent(slug)}`;
}
