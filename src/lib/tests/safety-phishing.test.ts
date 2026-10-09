import { describe, expect, it } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import type { EventDesign } from "@/lib/event-design/schema";
import { guestFacingContent } from "@/lib/safety/guest-content";
import { guestLinkProps, isSafeGuestHref, OUTBOUND_LINK_REL } from "@/lib/safety/links";
import { detectPhishingSignals, suspiciousLinkReason } from "@/lib/safety/phishing";
import { composeSiteDocument } from "@/lib/site-document";

const check = (texts: string[], links: string[] = [], slug?: string) => detectPhishingSignals({ texts, links, slug });

const WEDDING = [
  "Maya & Adam",
  "Saturday, June 14, 2027 · The Glasshouse, Toronto",
  "We met at a friend's birthday party in 2019 and have been inseparable ever since. We can't wait to celebrate with you.",
  "Hotel block: call the Fairmont Royal York at 1-800-441-1414 and provide your credit card number to hold your room by May 1 — mention the Maya & Adam wedding.",
  "Registry: we're registered at Amazon and Zola. Contributions to our honeymoon fund can be sent via PayPal or Venmo (@maya-adam).",
  "Our Wi-Fi password is glasshouse2027 — it's also on the table cards.",
  "The cash bar accepts credit and debit cards.",
  "Destination guests: please send us your passport number by March 1 so we can book the boat transfer.",
  "Use Google Maps to find the venue; parking is behind the Apple Store on Bloor.",
  "Please confirm your attendance and share your dietary restrictions in the form below.",
  "Kindly reply by May 1. Please enter your name and email so we can send updates.",
];

const BIRTHDAY = [
  "Layla turns 30!",
  "A killer playlist, too many tacos, and a pin-the-tail-on-the-donkey rematch.",
  "Drop a pin in the group chat when you're on your way. Send us your pin location if you get lost!",
  "Bring your PIN-protected Switch for Mario Kart. Venmo Sam for pizza money.",
  "Party at Chase Center suite 12 — tickets are in your email.",
  "Ups and downs, it's been a decade. Let's celebrate!",
];

const CORPORATE = [
  "Microsoft Security Summit 2027",
  "Northwind Q3 Offsite",
  "Please bring photo ID to verify your identity at the Google campus front desk; security check opens at 8:00.",
  "Sign in at the registration desk with your badge. Breakfast at 8:30.",
  "Join remotely on Microsoft Teams or Zoom; the meeting link and passcode will be emailed to registered attendees.",
  "Update your RSVP by Friday and confirm your session choices.",
  "Amazon Web Services re:Invent recap, followed by drinks.",
  "Coinbase and Stripe engineers will lead the payments panel.",
];

const NORMAL_LINKS = [
  "https://www.zola.com/registry/maya-and-adam",
  "https://www.amazon.com/wedding/share/maya-adam",
  "https://www.paypal.me/mayaadam",
  "https://venmo.com/u/maya-adam",
  "https://www.fairmont.com/royal-york-toronto/",
  "https://book.passkey.com/go/MayaAdamWedding",
  "https://www.google.com/maps/search/?api=1&query=The+Glasshouse",
  "https://maps.app.goo.gl/abc123",
  "https://zoom.us/j/123456789?pwd=abc",
  "https://docs.google.com/forms/d/e/1FAIpQ/viewform",
  "https://www.pineapple-events.com/menu",
  "https://www.amazon-adventures.com/tours",
  "https://www.applevalleygolf.com/",
  "https://www.theknot.com/us/author/maya",
  "https://eventbrite.com/e/northwind-offsite-1234",
];

describe("phishing heuristics: realistic event pages pass", () => {
  it.each([
    ["wedding", WEDDING],
    ["birthday", BIRTHDAY],
    ["corporate", CORPORATE],
  ])("does not flag %s copy", (_name, texts) => {
    expect(check(texts, NORMAL_LINKS)).toEqual([]);
  });

  it("does not flag normal slugs, including ones that mention a company", () => {
    for (const slug of ["maya-and-adam", "google-security-summit", "microsoft-offsite-2027", "amazon-team-party", "apple-picking-day"]) {
      expect(check(["A party"], [], slug), slug).toEqual([]);
    }
  });

  it("does not flag every bundled design sample", () => {
    for (const sample of DESIGN_SAMPLES) {
      const design: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "blush", content: sample.content };
      const config = { ...sample.config, design };
      const content = guestFacingContent(config, composeSiteDocument(config, "", (prefix) => `${prefix}_node`));
      expect(detectPhishingSignals({ ...content, slug: "sample-event" }), sample.key).toEqual([]);
    }
  });
});

describe("phishing heuristics: true positives", () => {
  it.each([
    ["Please enter your password below to view the guest list.", "credential_request"],
    ["To confirm your seat, verify your email password and one-time code.", "credential_request"],
    ["Reply with your online banking password to receive the gift.", "credential_request"],
    ["Log in with your Microsoft credentials to download the invitation.", "credential_request"],
    ["Enter your credit card number and CVV to reserve your seat.", "payment_card_request"],
    ["Provide your card details below to confirm.", "payment_card_request"],
    ["Security deposit: send the 3-digit CVV on the back of your card.", "payment_card_request"],
    ["Confirm your bank account number and routing number for the refund.", "bank_details_request"],
    ["Enter your online banking login to receive your gift card.", "bank_details_request"],
    ["Please provide your social security number for the guest list.", "identity_number_request"],
    ["Enter your 12-word seed phrase to receive the event NFT.", "crypto_secret_request"],
    ["Connect your wallet to claim your free tokens.", "crypto_secret_request"],
    ["Validate your wallet to unlock your ticket.", "crypto_secret_request"],
    ["PayPal: your account has been suspended. Verify your account to restore access.", "brand_impersonation"],
    ["Unusual sign-in activity detected on your Apple ID — confirm your login now.", "brand_impersonation"],
    ["Canada Revenue Agency: your tax refund is pending. Claim your refund today.", "brand_impersonation"],
    ["Your USPS package is on hold. Update your billing details to release it.", "brand_impersonation"],
    ["Eventloom Security Team", "brand_impersonation"],
  ])("flags %j", (text, signal) => {
    expect(check(["Maya & Adam", text])).toContain(signal);
  });

  it("flags a page titled as a brand's support or login page", () => {
    expect(check(["PayPal Account Verification"])).toContain("brand_impersonation");
    expect(check(["Microsoft 365 Login"])).toContain("brand_impersonation");
    expect(check(["Apple ID Verification Required"])).toContain("brand_impersonation");
    expect(check(["Microsoft Support"])).toContain("brand_impersonation");
  });

  it("flags brand + sign-in slugs", () => {
    expect(check(["A page"], [], "paypal-login")).toContain("brand_impersonation");
    expect(check(["A page"], [], "apple-id-verify")).toContain("brand_impersonation");
  });

  it.each([
    ["https://secure-login.example.com/", "login_link"],
    ["https://example.com/account/login?next=/", "login_link"],
    ["https://wallet-connect.example.io/verify", "login_link"],
    ["https://example.com/webscr?cmd=_login-run", "login_link"],
    ["https://paypal.com.verify-account.io/", "suspicious_link"],
    ["https://paypal-secure.com/", "suspicious_link"],
    ["https://bit.ly/3xYz", "suspicious_link"],
    ["https://192.168.10.4/gift", "suspicious_link"],
    ["https://xn--pypal-4ve.com/", "suspicious_link"],
    ["https://guest@example.com/", "suspicious_link"],
    ["http://example.com/rsvp", "suspicious_link"],
    ["//evil.example/rsvp", "suspicious_link"],
  ])("flags the link %s", (href, reason) => {
    expect(suspiciousLinkReason(href)).toBe(reason);
    expect(check(["Maya & Adam"], [href]).length).toBeGreaterThan(0);
  });

  it("ignores same-page anchors and same-site paths", () => {
    expect(suspiciousLinkReason("#rsvp")).toBeNull();
    expect(suspiciousLinkReason("/legal/privacy")).toBeNull();
  });
});

describe("guest-facing content", () => {
  it("collects the event facts, design copy, schedule, document text and outbound links", () => {
    const design: EventDesign = {
      version: 1,
      styleKey: "romantic",
      paletteKey: "blush",
      content: {
        story: { heading: "Our story", paragraphs: ["We met in Lisbon."] },
        goodToKnow: [{ title: "Parking", body: "Free on site." }],
        travel: { items: [{ title: "Hotel", body: "Room block", href: "https://hotel.example.com/book" }] },
      },
    };
    const config = {
      title: "Maya & Adam",
      subtitle: "Join us",
      eventType: "wedding",
      date: "2027-06-14",
      venueName: "The Glasshouse",
      schedule: [{ title: "Ceremony", time: "4 PM", description: "In the garden" }],
      rsvpFields: [],
      theme: { mood: "", colors: [], fontPairing: "" },
      design,
    };
    const document = composeSiteDocument(config, "", (prefix) => `${prefix}_node`);
    document.nodes.push({ id: "extra_button", type: "button", label: "Book a room", href: "https://other.example.com/rooms" });
    const content = guestFacingContent(config, document);
    for (const text of ["Maya & Adam", "Join us", "Our story", "We met in Lisbon.", "Parking", "Free on site.", "Ceremony", "In the garden", "Book a room"]) {
      expect(content.texts, text).toContain(text);
    }
    expect(content.links).toEqual(expect.arrayContaining(["https://hotel.example.com/book", "https://other.example.com/rooms"]));
  });
});

describe("guest links", () => {
  it("only allows same-page anchors, same-site paths and https", () => {
    expect(isSafeGuestHref("#rsvp")).toBe(true);
    expect(isSafeGuestHref("/legal/privacy")).toBe(true);
    expect(isSafeGuestHref("https://hotel.example.com")).toBe(true);
    for (const href of ["//evil.example", "/\\evil.example", "http://hotel.example.com", "javascript:alert(1)", "data:text/html,hi", "mailto:a@b.c", "https://user:pass@example.com"]) {
      expect(isSafeGuestHref(href), href).toBe(false);
    }
  });

  it("opens outbound links in a new tab without opener, referrer or ranking", () => {
    expect(guestLinkProps("https://hotel.example.com")).toEqual({ href: "https://hotel.example.com", target: "_blank", rel: OUTBOUND_LINK_REL });
    expect(OUTBOUND_LINK_REL).toBe("noopener noreferrer nofollow");
    expect(guestLinkProps("#rsvp")).toEqual({ href: "#rsvp" });
    expect(guestLinkProps("javascript:alert(1)")).toBeNull();
  });
});
