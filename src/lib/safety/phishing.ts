/**
 * Conservative phishing heuristics for the guest-facing text and links of a page that is about to be published.
 *
 * A hit does not mean the page is malicious; it holds the publish (`content_needs_review`) so a person can look.
 * The rules are deliberately narrow so normal event pages never trip them:
 * - Asking guests for secrets needs a request verb AND "your" + the secret ("enter your password"). Mentioning a
 *   Wi-Fi password, a cash bar that takes credit cards, or a PayPal/Venmo honeymoon fund is fine.
 * - Brand or government names alone are fine ("Amazon registry", "Google Maps", "Chase Center"); they only count
 *   next to account-security or refund language ("PayPal: your account is suspended, verify now").
 * - Links count only when they look like a sign-in or wallet page, hide their destination, or pose as a brand.
 */

export type PhishingSignal =
  | "credential_request"
  | "payment_card_request"
  | "bank_details_request"
  | "identity_number_request"
  | "crypto_secret_request"
  | "brand_impersonation"
  | "login_link"
  | "suspicious_link";

export type PhishingInput = { texts: string[]; links: string[]; slug?: string | null };

// A request addressed to the guest. "Enter", "verify", "provide", "send us", "reply with", "type in", …
const REQUEST = String.raw`(?:enter|re-?enter|type(?:\s+in)?|provide|submit|confirm|verify|validate|update|share|send(?:\s+(?:us|me))?|reply\s+with|include|fill\s+in|give\s+us|input|log\s*in\s+with|sign\s*in\s+with)`;
// Up to ~6 short words between the verb and "your", e.g. "please enter below your", "confirm the details of your".
const GAP = String.raw`(?:\s+[\w'’-]+){0,6}?\s+`;
const YOUR = String.raw`(?:your|ur)`;

// At most two words between "your" and the secret ("your online banking password"), and never across punctuation.
function requestFor(target: string) {
  return new RegExp(String.raw`\b${REQUEST}${GAP}${YOUR}(?:\s+[\w'’-]+){0,2}?\s+${target}`, "i");
}

const CREDENTIAL_REQUEST = requestFor(String.raw`(?:password|passcode|passphrase|log-?in(?:\s+details|\s+credentials)?|sign-?in\s+details|credentials|one[-\s]time\s+(?:pass)?code|otp|2fa\s+code|verification\s+code|authenticator\s+code|pin\s+(?:code|number))\b`);
const CARD_REQUEST = requestFor(String.raw`(?:(?:credit|debit|bank)\s+card(?:\s+(?:number|details|info(?:rmation)?))?|card\s+(?:number|details|info(?:rmation)?)|cvv2?|cvc|expiry\s+date|expiration\s+date)`);
const CARD_CODE = /\b(?:cvv2?|cvc2?|card\s+security\s+code)\b/i;
const BANK_REQUEST = requestFor(String.raw`(?:(?:online\s+)?bank(?:ing)?\s+(?:login|log-?in|password|username|user\s*name|credentials|account\s+(?:number|details|login))|account\s+number|routing\s+number|sort\s+code|iban|swift\s+code)`);
// Not passport numbers: destination weddings legitimately collect them for transfer manifests.
const IDENTITY_REQUEST = requestFor(String.raw`(?:social\s+security\s+number|ssn|social\s+insurance\s+number|sin\s+number|national\s+insurance\s+number)\b`);
// Hotel-block instructions ("call the hotel and provide your credit card to hold the room") are normal.
const HOTEL_CONTEXT = /\b(?:hotel|resort|inn|lodge|front\s+desk|reservations?\s+(?:line|desk|team)|call|phone|room\s+block|booking\s+(?:link|site|page|code))\b/i;
const CRYPTO_SECRET = /\b(?:seed\s+phrase|recovery\s+phrase|secret\s+(?:recovery\s+)?phrase|mnemonic\s+phrase|private\s+key|(?:12|twelve|24|twenty[-\s]four)[-\s]word\s+(?:phrase|key|seed)|connect\s+(?:your\s+)?wallet|wallet\s+(?:validation|verification|sync(?:hroni[sz]ation)?)|(?:validate|verify|synchroni[sz]e|sync|restore)\s+your\s+wallet|claim\s+(?:your\s+)?(?:airdrop|free\s+(?:tokens|crypto|nft)))\b/i;

// Companies, banks and agencies most often impersonated, plus Eventloom itself.
const BRANDS = [
  "eventloom", "paypal", "apple", "icloud", "microsoft", "outlook", "office ?365", "google", "gmail", "amazon", "netflix",
  "meta", "facebook", "instagram", "whatsapp", "coinbase", "binance", "metamask", "trust ?wallet", "ledger", "venmo",
  "cash ?app", "zelle", "interac", "stripe", "docusign", "dropbox", "chase", "bank of america", "wells fargo", "citibank",
  "hsbc", "barclays", "rbc", "royal bank", "td bank", "scotiabank", "bmo", "cibc", "irs", "internal revenue service",
  "cra", "canada revenue agency", "hmrc", "social security administration", "service canada", "usps", "canada post",
  "royal mail", "fedex", "dhl", "ups",
];
const BRAND = String.raw`\b(?:${BRANDS.join("|")})\b`;
// Account-security, payment-problem and refund lures.
// Not "verify your identity" or "security check": corporate venues ask for photo ID at the front desk.
const LURE = String.raw`(?:account\s+(?:has\s+been\s+|is\s+|was\s+)?(?:suspended|locked|disabled|limited|restricted|on\s+hold|compromised)|(?:verify|confirm|validate|secure|unlock|restore|reactivate)\s+(?:your\s+)?(?:account|login)|unusual\s+(?:activity|sign-?in|login)|suspicious\s+(?:activity|sign-?in|login)|security\s+alert|(?:tax\s+)?refund\s+(?:is\s+)?(?:pending|available|waiting|approved)|claim\s+(?:your\s+)?refund|(?:package|parcel|delivery|shipment)\s+(?:is\s+)?(?:on\s+hold|failed|suspended|pending\s+payment)|update\s+(?:your\s+)?(?:billing|payment)\s+(?:details|information|info|method)|official\s+(?:support|security|verification)\s+(?:page|team|center|centre))`;
const BRAND_LURE = new RegExp(String.raw`${BRAND}[\s\S]{0,160}?${LURE}|${LURE}[\s\S]{0,160}?${BRAND}`, "i");
// A whole text that presents itself as a brand's support/security/login page ("PayPal Account Verification"), but not
// an event named after one ("Microsoft Security Summit").
const BRAND_TITLE = new RegExp(String.raw`^\s*${BRAND}(?:\s+(?:365|id|pay|cloud|online|web))?\s*(?:[-–—:|]\s*)?(?:customer\s+)?(?:support|security|account|login|log-?in|sign-?in|verification|help\s*desk|refunds?|billing|wallet)(?:\s+(?:center|centre|team|portal|page|update|alert|required|verification|recovery|services?))?\s*[.!]?\s*$`, "i");
const BRAND_NAME = new RegExp(BRAND, "i");
const SLUG_LURE = /(?:^|-)(?:login|signin|verify|verification|secure|wallet|refund|billing|unlock|recovery)(?:-|$)/;

// Path or subdomain words that only sign-in, wallet and account-recovery pages use.
const LOGIN_WORD = /(?:^|[./_?=&-])(?:login|log-in|logon|signin|sign-in|sso|oauth2?|auth|verify|verification|validate|password|passwd|reset-password|recover|wallet|webscr|cmd=_login|banking|secure-?(?:login|account|update))(?:$|[./_?=&-])/i;
const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy", "shorturl.at", "ow.ly", "buff.ly", "rebrand.ly",
  "tiny.cc", "s.id", "t.ly", "v.gd", "shorte.st", "adf.ly", "bl.ink", "lnkd.in",
]);
// Hosts a brand really uses. Another host counts as an impostor only when the brand is a whole label or hyphenated
// word of it AND it sits in a subdomain (paypal.com.example.io) or next to a sign-in word (paypal-secure-login.com),
// so "pineapple.com" or "amazon-adventures.com" are fine.
const BRAND_HOSTS: Record<string, string[]> = {
  paypal: ["paypal.com", "paypal.me"], apple: ["apple.com", "icloud.com"], microsoft: ["microsoft.com", "live.com", "office.com"],
  google: ["google.com", "goo.gl", "googleusercontent.com", "youtube.com"], amazon: ["amazon.com", "amazon.ca", "amazon.co.uk", "a.co"],
  netflix: ["netflix.com"], facebook: ["facebook.com", "fb.com"], instagram: ["instagram.com"], whatsapp: ["whatsapp.com", "wa.me"],
  coinbase: ["coinbase.com"], binance: ["binance.com"], metamask: ["metamask.io"], venmo: ["venmo.com"], chase: ["chase.com"],
  wellsfargo: ["wellsfargo.com"], bankofamerica: ["bankofamerica.com"], eventloom: ["eventloom.co"], interac: ["interac.ca"],
  docusign: ["docusign.com", "docusign.net"], dropbox: ["dropbox.com"], irs: ["irs.gov"], usps: ["usps.com"], fedex: ["fedex.com"],
};

const HOST_LURE = new Set(["login", "signin", "secure", "security", "verify", "verification", "account", "accounts", "support", "update", "wallet", "auth", "billing", "refund", "unlock", "recovery"]);

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Why a link looks like phishing, or null. Only https links are expected here (the page schemas reject the rest). */
export function suspiciousLinkReason(href: string): "login_link" | "suspicious_link" | null {
  const value = href.trim();
  if (!value || value.startsWith("#")) return null;
  // Protocol-relative ("//host", "/\host") leaves the site while looking like a path.
  if (value.startsWith("//") || value.startsWith("/\\")) return "suspicious_link";
  if (value.startsWith("/")) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "suspicious_link";
  }
  if (url.protocol !== "https:") return "suspicious_link";
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.username || url.password) return "suspicious_link";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.startsWith("[") || host.split(".").some((label) => label.startsWith("xn--"))) return "suspicious_link";
  if (SHORTENERS.has(host)) return "suspicious_link";
  const labels = host.split(".");
  const subdomainTokens = labels.slice(0, -2).flatMap((label) => label.split("-"));
  const domainTokens = labels.slice(-2, -1).flatMap((label) => label.split("-"));
  for (const [brand, domains] of Object.entries(BRAND_HOSTS)) {
    if (domains.some((domain) => hostMatches(host, domain))) continue;
    if (subdomainTokens.includes(brand) || (domainTokens.includes(brand) && domainTokens.some((token) => HOST_LURE.has(token)))) return "suspicious_link";
  }
  const subdomains = labels.slice(0, -2).join(".");
  if (LOGIN_WORD.test(`${subdomains ? `.${subdomains}.` : ""}${url.pathname}${url.search}`)) return "login_link";
  return null;
}

export function detectPhishingSignals(input: PhishingInput): PhishingSignal[] {
  const signals = new Set<PhishingSignal>();
  const texts = input.texts.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
  const all = texts.join("\n");

  if (CREDENTIAL_REQUEST.test(all)) signals.add("credential_request");
  const sentences = all.split(/(?<=[.!?\n])\s+/);
  const outsideHotelContext = (pattern: RegExp) => sentences.some((sentence) => pattern.test(sentence) && !HOTEL_CONTEXT.test(sentence));
  if (outsideHotelContext(CARD_REQUEST) || CARD_CODE.test(all)) signals.add("payment_card_request");
  if (outsideHotelContext(BANK_REQUEST)) signals.add("bank_details_request");
  if (IDENTITY_REQUEST.test(all)) signals.add("identity_number_request");
  if (CRYPTO_SECRET.test(all)) signals.add("crypto_secret_request");
  if (texts.some((text) => BRAND_LURE.test(text) || BRAND_TITLE.test(text))) signals.add("brand_impersonation");
  const slug = input.slug?.toLowerCase() ?? "";
  if (slug && BRAND_NAME.test(slug.replace(/-/g, " ")) && SLUG_LURE.test(slug)) signals.add("brand_impersonation");

  for (const link of input.links) {
    const reason = suspiciousLinkReason(link);
    if (reason) signals.add(reason);
  }
  return [...signals].sort();
}
