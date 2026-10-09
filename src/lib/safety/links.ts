/**
 * Link rules for guest pages. Host- or AI-written links may only be same-page anchors ("#rsvp"), same-site paths
 * ("/…", but never the protocol-relative "//host" or "/\host", which browsers treat as another site), or https URLs.
 * Outbound links open in a new tab without a referrer or opener, and carry nofollow so Eventloom's domain lends no
 * search ranking to whatever a host links to.
 */

export const OUTBOUND_LINK_REL = "noopener noreferrer nofollow";

export function isInternalHref(href: string) {
  return href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\"));
}

export function isHttpsHref(href: string) {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isSafeGuestHref(href: string) {
  const value = href.trim();
  return isInternalHref(value) || isHttpsHref(value);
}

/** Anchor props for a guest-page link, or null when the link must not be rendered as a link at all. */
export function guestLinkProps(href: string | null | undefined): { href: string; target?: "_blank"; rel?: string } | null {
  const value = href?.trim() ?? "";
  if (!value) return null;
  if (isInternalHref(value)) return { href: value };
  if (isHttpsHref(value)) return { href: value, target: "_blank", rel: OUTBOUND_LINK_REL };
  return null;
}
