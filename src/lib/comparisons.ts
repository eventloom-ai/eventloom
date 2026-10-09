import type { Metadata } from "next";
import { LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";
import type { FaqItem } from "@/lib/structured-data";

// Honest, sourced comparisons for /compare/* and the RSVP builders guide.
// Rules: every competitor claim must be checked on that company's own site and listed in `sources`;
// if a detail can't be verified there, leave it out (never guess prices). Re-check and bump `checkedAt` when editing.

export const COMPARE_PATH = "/compare";
export const GUIDE_PATH = "/guides/best-rsvp-website-builders";

export function comparePath(slug: string) {
  return `${COMPARE_PATH}/${slug}`;
}

const price = `$${LAUNCH_PRICE_CENTS / 100}`;

export type ComparisonRowKey =
  | "bestFor" | "pricing" | "freeOption" | "howBuilt" | "eventTypes" | "rsvpQuestions" | "guestSignIn"
  | "messaging" | "registry" | "invitations" | "ticketing" | "mobileApp" | "ads" | "privacy";

export const comparisonRowLabels: Record<ComparisonRowKey, string> = {
  bestFor: "Best for",
  pricing: "Price",
  freeOption: "Free option",
  howBuilt: "How the page is made",
  eventTypes: "Event types",
  rsvpQuestions: "RSVP questions",
  guestSignIn: "What guests need to reply",
  messaging: "Messages and reminders to guests",
  registry: "Registry and cash funds",
  invitations: "Invitations (digital or paper)",
  ticketing: "Tickets and check-in",
  mobileApp: "Mobile app",
  ads: "Ads and branding",
  privacy: "Privacy controls",
};

/** Eventloom's side of every table. Keep each line true to the product (see src/app/llms.txt/route.ts). */
export const eventloomColumn: Record<ComparisonRowKey, string> = {
  bestFor: "Hosts who want a custom-designed event website with RSVP for any occasion, made in minutes.",
  pricing: `Free to draft. ${price} once to publish one event for a year. No subscription and no per-guest pricing.`,
  freeOption: `Drafting and previewing are free, with starter AI credit. There is no free published plan: going live costs ${price}.`,
  howBuilt: "AI drafts the whole site (layout, colors, fonts, wording, schedule, RSVP) from your description in seconds. Edit visually or by asking in plain words.",
  eventTypes: "Any occasion: weddings, birthdays, showers, graduations, reunions, holiday parties, memorials, small corporate events.",
  rsvpQuestions: "Built-in fields for attendance, party size, guest names, email, phone, and meal or dietary preference, plus a free-text note. No custom question builder. CSV export.",
  guestSignIn: "Just the link. No account, app, or phone verification.",
  messaging: "None built in. You share the link and any updates yourself by text, email, or social; Eventloom sends no invitations, reminders, or blasts.",
  registry: "None.",
  invitations: "No separate cards and no paper. The event website and its link are the invitation.",
  ticketing: "None. No ticket sales, seating charts, or check-in.",
  mobileApp: "No native app. Event sites work in any phone browser.",
  ads: "No ads on event sites.",
  privacy: "Event pages are kept out of search engines and replies are visible only to the host. No password protection.",
};

export type ComparisonSource = { label: string; url: string };

export type Competitor = {
  slug: string;
  name: string;
  /** The competitor's own registrable domains; every source must be on one of them. */
  domains: readonly string[];
  homepage: string;
  category: string;
  /** One line for cards and lists. */
  oneLiner: string;
  title: string;
  metaDescription: string;
  /** The 2–3 sentence answer at the top of the page, written to be quotable on its own. */
  verdict: string;
  rows: readonly { key: ComparisonRowKey; competitor: string }[];
  chooseEventloom: readonly string[];
  chooseCompetitor: readonly string[];
  bottomLine: string;
  faqs: readonly FaqItem[];
  /** Short entry for the RSVP builders guide. */
  guide: { pricing: string; bestFor: string; watchOut: string };
  /** Occasion template slugs (and landing-page event types) where this comparison is a useful next read. */
  relatedOccasions: readonly string[];
  sources: readonly ComparisonSource[];
  /** ISO date (YYYY-MM-DD) the sources were last checked. */
  checkedAt: string;
};

const CHECKED_AT = "2026-10-08";

export const competitors: readonly Competitor[] = [
  {
    slug: "zola",
    name: "Zola",
    domains: ["zola.com"],
    homepage: "https://www.zola.com/",
    category: "Wedding planning platform",
    oneLiner: "A free wedding website with registry and matching paper, versus a custom AI-built site for any event.",
    title: "Eventloom vs Zola: wedding website and RSVP comparison",
    metaDescription: "Eventloom vs Zola, checked October 2026: price, RSVP questions, registry, invitations, and who should pick which for a wedding website.",
    verdict: `Zola is the better choice for most couples who want a free wedding website with a registry, per-event RSVPs with custom questions, and matching paper invitations in one place. Eventloom is for hosts who would rather have a one-off site designed from their own description by AI, for a wedding or any other event, and who are happy to pay ${price} once and handle registry and guest messages elsewhere.`,
    rows: [
      { key: "bestFor", competitor: "Couples who want a free wedding website tied to a registry, guest list, paper suite, and planning tools." },
      { key: "pricing", competitor: "The wedding website is free to create and publish. Custom domains start at $17.99." },
      { key: "freeOption", competitor: "Yes. The website is free." },
      { key: "howBuilt", competitor: "Choose from over 600 templates and customize them." },
      { key: "eventTypes", competitor: "Weddings." },
      { key: "rsvpQuestions", competitor: "Meal choices and custom questions per event, separate RSVPs for multiple events, and CSV or Excel export. Guests look themselves up on your guest list." },
      { key: "messaging", competitor: "Email one guest or the whole list. Texting the whole list requires a paid plan." },
      { key: "registry", competitor: "Gifts, experiences, cash funds, and group gifting. Cash funds carry a 2.5% card fee that the couple or guests can cover." },
      { key: "invitations", competitor: "Paper save-the-dates from $0.99 and invitations from $1.79 each, matching the website. Digital save-the-dates are available; digital invitations are not offered." },
      { key: "mobileApp", competitor: "Free app, iOS only." },
      { key: "privacy", competitor: "Optional password protection." },
    ],
    chooseEventloom: [
      "You want the site designed from your description, not picked from a template.",
      "You are hosting something other than a wedding, or want one tool for the shower, engagement party, and reunion too.",
      "You want to change the page by asking in plain words.",
      "You don't need a registry, and you will send the link and updates yourself.",
    ],
    chooseCompetitor: [
      "You want the wedding website to be free.",
      "You need a registry or cash fund connected to the site.",
      "You want custom RSVP questions and separate RSVPs for the welcome party, ceremony, and brunch.",
      "You want matching paper save-the-dates and invitations, plus a seating chart and vendor marketplace.",
    ],
    bottomLine: "If your plan is a traditional wedding with a registry, Zola does more for less. Eventloom is the better fit when the design of the page matters most to you, or the event isn't a wedding.",
    faqs: [
      { question: "Is Zola's wedding website free?", answer: `Yes. Zola says its wedding websites are free to create and publish; custom domains are a paid extra starting at $17.99. Eventloom is free to draft and costs ${price} once to publish an event for a year.` },
      { question: "Does Eventloom have a wedding registry like Zola?", answer: "No. Eventloom has no registry or cash fund. If a registry is important to you, Zola (or another registry) is the better choice." },
      { question: "Which is better for custom RSVP questions?", answer: "Zola. It supports custom questions and meal choices for each event. Eventloom has fixed built-in fields (attendance, party size, guest names, email, phone, meal or dietary preference) plus a free-text note." },
      { question: "Can I use Eventloom or Zola for events that aren't weddings?", answer: "Zola's website and RSVP are built for weddings. Eventloom builds sites for any occasion, including birthdays, showers, reunions, memorials, and small corporate events." },
    ],
    guide: {
      pricing: "Website free; custom domains from $17.99; paper invitations from $1.79 each.",
      bestFor: "Couples who want website, registry, guest list, and matching paper in one free account.",
      watchOut: "Built for weddings, no digital invitations, and the app is iOS only.",
    },
    relatedOccasions: ["wedding", "engagement"],
    sources: [
      { label: "Zola: Wedding websites", url: "https://www.zola.com/wedding-planning/website" },
      { label: "Zola FAQ: Does Zola sell custom domain names?", url: "https://www.zola.com/faq/115001755451-does-zola-sell-custom-domain-names-" },
      { label: "Zola FAQ: How do I edit or add questions to RSVPs?", url: "https://www.zola.com/faq/115002259452-how-do-i-edit-or-add-questions-to-rsvps-" },
      { label: "Zola FAQ: Can I collect RSVPs for multiple events?", url: "https://www.zola.com/faq/115003103872-can-i-collect-rsvps-for-multiple-events-" },
      { label: "Zola FAQ: How can my guests RSVP online?", url: "https://www.zola.com/faq/115002259432-how-can-my-guests-rsvp-online-what-does-that-experience-look-like-to-them-" },
      { label: "Zola FAQ: Can I send a message to my guests?", url: "https://www.zola.com/faq/115002148872-can-i-send-a-message-to-my-guest-or-a-bulk-message-from-my-guest-list-" },
      { label: "Zola FAQ: Premium guest messaging", url: "https://www.zola.com/faq/how-does-zolas-premium-guest-messaging-feature-work" },
      { label: "Zola: How cash gifts work", url: "https://www.zola.com/wedding-registry/how-cash-gifts-work" },
      { label: "Zola: Wedding paper", url: "https://www.zola.com/wedding-planning/paper" },
      { label: "Zola FAQ: Do you offer digital invitations?", url: "https://www.zola.com/faq/do-you-offer-digital-invitations" },
      { label: "Zola FAQ: Can I send digital save-the-dates?", url: "https://www.zola.com/faq/115002136551-can-i-send-digital-save-the-dates-through-zola-" },
      { label: "Zola: Wedding planning app", url: "https://www.zola.com/wedding-planning/app" },
    ],
    checkedAt: CHECKED_AT,
  },
  {
    slug: "the-knot",
    name: "The Knot",
    domains: ["theknot.com"],
    homepage: "https://www.theknot.com/",
    category: "Wedding planning platform",
    oneLiner: "A free wedding website with a universal registry and vendor marketplace, versus a custom AI-built site for any event.",
    title: "Eventloom vs The Knot: wedding website and RSVP comparison",
    metaDescription: "Eventloom vs The Knot, checked October 2026: price, RSVP questions, registry, invitations, and which wedding or event website suits you.",
    verdict: `The Knot is a strong free choice for weddings: the website costs nothing, RSVPs support custom and meal questions, and it connects to a universal registry, a vendor marketplace, and matching stationery. Eventloom suits hosts who want a site generated from their own description for ${price} once, especially for events that aren't weddings, since The Knot's RSVP page always uses wedding language.`,
    rows: [
      { key: "bestFor", competitor: "Couples who want a free wedding website alongside a registry, vendor search, and planning tools." },
      { key: "pricing", competitor: "Free, with no required fees. Optional custom domain: $19.99 for one year, $39.98 for two, .wedding domains $99.99 a year." },
      { key: "freeOption", competitor: "Yes. The website is completely free to use." },
      { key: "howBuilt", competitor: "Choose from 100+ designs, most with matching invitations and save-the-dates." },
      { key: "eventTypes", competitor: "Weddings. The RSVP page uses wedding language that can't be changed, even for showers or vow renewals." },
      { key: "rsvpQuestions", competitor: "RSVP tied to your guest list and specific events, with custom short-answer or multiple-choice questions, including meal choices." },
      { key: "messaging", competitor: "Guest messaging and RSVP reminder templates are included free." },
      { key: "registry", competitor: "Universal registry combining The Knot store, cash funds, experiences, and registries from other retailers. The Knot takes 0% of cash funds; card payments carry a 2.5% fee paid by the guest." },
      { key: "invitations", competitor: "Paper stationery suites, plus free digital save-the-dates." },
      { key: "mobileApp", competitor: "Free on iOS and Android; not offered to international users." },
      { key: "privacy", competitor: "Password protection, and RSVP open to anyone or to your guest list only." },
    ],
    chooseEventloom: [
      "Your event isn't a wedding and you want the RSVP page to say so.",
      "You want a page designed for your event from a description, instead of choosing among set designs.",
      "You want to edit by asking in plain words, and you prefer a small, focused tool.",
      "You don't need a registry or vendor marketplace.",
    ],
    chooseCompetitor: [
      "You want the wedding website free.",
      "You want a universal registry that pulls in other stores, with 0% taken from cash funds.",
      "You want custom RSVP questions and per-event guest lists.",
      "You want matching paper stationery, a vendor marketplace, and a planning app.",
    ],
    bottomLine: "For a wedding where you also need a registry and vendors, The Knot covers more and costs nothing. Eventloom is the better pick for non-wedding events and for hosts who care most about a distinctive page.",
    faqs: [
      { question: "Is The Knot wedding website really free?", answer: "Yes. The Knot's help center says its wedding websites are completely free to use, with a custom domain as an optional paid upgrade ($19.99 for one year at the time we checked)." },
      { question: "Can I use The Knot for a party that isn't a wedding?", answer: "You can, but The Knot's help center says the RSVP page automatically uses wedding language and the label can't be changed. Eventloom builds the page and RSVP around whatever event you describe." },
      { question: "Does Eventloom have a registry?", answer: "No. Eventloom has no registry or cash fund. If you need one, The Knot's universal registry is a good option." },
      { question: "How much does Eventloom cost compared with The Knot?", answer: `The Knot's website is free. Eventloom is free to draft and costs ${price} once to publish one event for a year, with no subscription and no ads.` },
    ],
    guide: {
      pricing: "Website free; custom domain $19.99 for a year.",
      bestFor: "Couples who want a free site plus a universal registry and vendor marketplace.",
      watchOut: "Wedding-only RSVP wording, and the app isn't offered to international users.",
    },
    relatedOccasions: ["wedding", "engagement"],
    sources: [
      { label: "The Knot help center: Are wedding websites on The Knot free to use?", url: "https://helpcenter.theknot.com/hc/en-us/articles/49532117369364-Are-wedding-websites-on-The-Knot-free-to-use" },
      { label: "The Knot help center: How do I purchase a custom domain?", url: "https://helpcenter.theknot.com/hc/en-us/articles/360042645552-How-do-I-purchase-a-custom-domain-for-my-wedding-website" },
      { label: "The Knot: Wedding websites", url: "https://www.theknot.com/gs/wedding-websites" },
      { label: "The Knot help center: Can I add a password to my wedding website?", url: "https://helpcenter.theknot.com/hc/en-us/articles/9604824098580-Can-I-add-a-password-to-my-Wedding-Website" },
      { label: "The Knot help center: How do I use the RSVP feature?", url: "https://helpcenter.theknot.com/hc/en-us/articles/38093261749652-How-do-I-use-the-RSVP-feature-on-my-wedding-website" },
      { label: "The Knot help center: Custom questions and meal options", url: "https://helpcenter.theknot.com/hc/en-us/articles/4415555220628-How-do-I-add-Custom-Questions-Meal-Options-for-the-RSVP-section" },
      { label: "The Knot help center: Our event isn't a wedding", url: "https://helpcenter.theknot.com/hc/en-us/articles/38158942117908-Our-event-isn-t-a-wedding-can-we-change-the-RSVP-page-to-reflect-that" },
      { label: "The Knot: Registry", url: "https://www.theknot.com/registry" },
      { label: "The Knot help center: Is the cash fund really free?", url: "https://helpcenter.theknot.com/hc/en-us/articles/9639308058644-Is-the-Cash-Fund-really-free-to-create-and-use" },
      { label: "The Knot help center: Does The Knot make wedding invitations?", url: "https://helpcenter.theknot.com/hc/en-us/articles/49526203558932-Does-The-Knot-make-wedding-invitations" },
      { label: "The Knot: Digital save-the-date cards", url: "https://www.theknot.com/paper/save-the-dates/digital-save-the-date-cards" },
      { label: "The Knot help center: Does The Knot have an app?", url: "https://helpcenter.theknot.com/hc/en-us/articles/9607123004436-Does-The-Knot-have-an-app" },
    ],
    checkedAt: CHECKED_AT,
  },
  {
    slug: "joy",
    name: "Joy",
    domains: ["withjoy.com"],
    homepage: "https://withjoy.com/",
    category: "Free wedding website and app",
    oneLiner: "A free wedding website, guest app, and registry, versus a custom AI-built site for any event.",
    title: "Eventloom vs Joy: wedding website and RSVP comparison",
    metaDescription: "Eventloom vs Joy, checked October 2026: free vs $20, custom RSVP questions, registry, guest app, messaging, and who should pick which.",
    verdict: `For most weddings, Joy is the stronger all-in-one pick: the website, online RSVP with custom questions, guest app, and registry are free. Eventloom is worth ${price} if you want a site generated from your own description and edited by asking, for any kind of event, and you don't need a registry, app, or guest messaging.`,
    rows: [
      { key: "bestFor", competitor: "Couples who want a free website, RSVP, guest app, and registry in one place." },
      { key: "pricing", competitor: "Free to use. Optional paid upgrades include a custom domain (typically about $19.99 a year), Messaging Plus (a one-time purchase per event), and premium stationery." },
      { key: "freeOption", competitor: "Yes. Website, registry, app, unlimited guests, and online RSVP are free." },
      { key: "howBuilt", competitor: "Choose from hundreds of free templates. An AI writing helper drafts vows, toasts, and stories; it doesn't build the site." },
      { key: "eventTypes", competitor: "Built for weddings; Joy says the site can be adapted for anniversaries, birthday parties, and baby showers." },
      { key: "rsvpQuestions", competitor: "Custom questions (multiple choice, short answer), meal and dietary questions, private questions for selected guests, per-event tracking, and RSVP limited to your guest list." },
      { key: "guestSignIn", competitor: "No account needed to view the site or RSVP in a browser; the app needs an account." },
      { key: "messaging", competitor: "Sending email to guests is free. Messaging Plus adds text blasts, text reminders, and scheduled sending." },
      { key: "registry", competitor: "Registry with cash and honeymoon funds. No Joy fee on cash funds via Venmo, PayPal, or Cash App; card gifts carry a 3.5% processing fee paid by the giver." },
      { key: "invitations", competitor: "Free basic digital cards. Premium digital cards (minimum 50) and matching paper cards are paid." },
      { key: "mobileApp", competitor: "Yes, with guest updates and a shared photo gallery." },
      { key: "privacy", competitor: "Password-protected private pages, and an option to keep the site out of search engines." },
    ],
    chooseEventloom: [
      "You want the whole site generated from your description rather than starting from a template.",
      "You are hosting a non-wedding event and want a page built for that occasion.",
      "You want to make changes by asking in plain words.",
      "You don't need a registry, guest app, or built-in messaging.",
    ],
    chooseCompetitor: [
      "You want it free.",
      "You need a registry or cash fund.",
      "You need custom or private RSVP questions, or separate invite lists for several wedding events.",
      "You want a guest app with a shared photo album, password-protected pages, and the option to email or text guests.",
    ],
    bottomLine: "Joy gives couples more for free. Eventloom earns its place when the look of the page matters most or the event isn't a wedding.",
    faqs: [
      { question: "Is Joy free?", answer: "Yes. Joy's pricing page says Joy is free to use, including the wedding website, registry, app, and online RSVP. Optional upgrades such as a custom domain, text messaging, and premium designs cost extra." },
      { question: "Do guests need an account to RSVP?", answer: "Not on either. Joy says guests don't need an account to view the site or RSVP in a browser (the app needs one). Eventloom guests reply from the link without an account." },
      { question: "Which has better RSVP questions?", answer: "Joy. It supports custom, private, and per-event questions. Eventloom uses fixed built-in fields (attendance, party size, guest names, email, phone, meal or dietary preference) plus a free-text note." },
      { question: "Why pay for Eventloom when Joy is free?", answer: `Eventloom builds a one-off design from your description in seconds and lets you edit it by asking, for any occasion. If a free template site with a registry covers what you need, Joy is the better value.` },
    ],
    guide: {
      pricing: "Free; optional paid custom domain (about $19.99 a year), Messaging Plus, and premium stationery.",
      bestFor: "Couples who want the most free features: website, RSVP with custom questions, guest app, and registry.",
      watchOut: "Template-based and wedding-first; texting guests is a paid add-on.",
    },
    relatedOccasions: ["wedding", "engagement", "anniversary", "baby-shower"],
    sources: [
      { label: "Joy: Pricing", url: "https://withjoy.com/pricing" },
      { label: "Joy help: Custom domains FAQ", url: "https://withjoy.com/help/en/articles/8320150-general-faqs-custom-domains" },
      { label: "Joy help: Messaging Plus", url: "https://withjoy.com/help/en/articles/14480210-send-text-messages-to-your-guests-with-messaging-plus" },
      { label: "Joy help: Sending email and reminder messages", url: "https://withjoy.com/help/en/articles/8346349-sending-email-and-reminder-messages" },
      { label: "Joy help: Premium digital cards", url: "https://withjoy.com/help/en/articles/10168216-designing-and-sending-premium-digital-cards" },
      { label: "Joy: Online RSVP", url: "https://withjoy.com/online-rsvp/" },
      { label: "Joy help: Do I need an account to view a website?", url: "https://withjoy.com/help/articles/8315020-do-i-need-an-account-to-view-a-website" },
      { label: "Joy help: Website privacy settings", url: "https://withjoy.com/help/en/articles/8310196-website-privacy-settings" },
      { label: "Joy help: Registry FAQ", url: "https://withjoy.com/help/en/articles/9794151-registry-frequently-asked-questions" },
      { label: "Joy: Wedding website", url: "https://withjoy.com/wedding-website/" },
      { label: "Joy: Writer's Block", url: "https://withjoy.com/writersblock/" },
    ],
    checkedAt: CHECKED_AT,
  },
  {
    slug: "partiful",
    name: "Partiful",
    domains: ["partiful.com"],
    homepage: "https://partiful.com/",
    category: "Free social party invites",
    oneLiner: "Free, phone-first party invites with text blasts, versus a custom event website guests answer from a link.",
    title: "Eventloom vs Partiful: party invitation and RSVP comparison",
    metaDescription: "Eventloom vs Partiful, checked October 2026: free vs $20, how guests RSVP, text blasts, design, and which suits your party or event.",
    verdict: `Partiful is the better pick for casual parties if you want something free with text blasts, reminders, a social feed, and an app; guests reply with their name and a verified phone number. Eventloom suits hosts who want a full, custom-designed event website that guests answer from a link with no phone verification, for ${price} once per event.`,
    rows: [
      { key: "bestFor", competitor: "Casual social events where guests are happy to use their phone number and you want texting built in." },
      { key: "pricing", competitor: "The core platform is free. Optional paid extras, such as premium invite designs, have no published prices. Ticketed events carry a fee." },
      { key: "freeOption", competitor: "Yes. Partiful says it is free with no ads." },
      { key: "howBuilt", competitor: "Pick a template or poster and customize backgrounds, fonts, and animations, or upload your own image or GIF." },
      { key: "eventTypes", competitor: "Birthdays, dinners, housewarmings, holiday parties, and other social events, plus organizations." },
      { key: "rsvpQuestions", competitor: "Guest questionnaire with short-answer, dropdown, and social-handle questions; answers export to CSV." },
      { key: "guestSignIn", competitor: "Name and phone number, confirmed with a texted code, in a browser or the app." },
      { key: "messaging", competitor: "Text blasts to all guests and automatic text reminders (the host can turn these off)." },
      { key: "ticketing", competitor: "Paid ticketing with ticket tiers and QR check-in." },
      { key: "mobileApp", competitor: "iPhone and Android apps, plus web." },
      { key: "ads", competitor: "No ads." },
      { key: "privacy", competitor: "Hide the guest list and count, and require host approval for guests." },
    ],
    chooseEventloom: [
      "You want a full event page with the schedule, venue, and details, designed for your event rather than a poster.",
      "You don't want to ask guests to verify a phone number before they reply.",
      "The occasion is more formal, like a wedding, shower, reunion, or memorial, where a website fits better than a party invite.",
      "You are fine sharing the link and updates yourself.",
    ],
    chooseCompetitor: [
      "You want it free.",
      "You want to text updates to everyone and send automatic reminders.",
      "You are selling tickets or want QR check-in.",
      "Your friends already use Partiful and enjoy the comments, polls, and shared photo album.",
    ],
    bottomLine: "For a casual party with friends who already use Partiful, it is hard to beat free. Eventloom is for when you want the page itself to feel like the event.",
    faqs: [
      { question: "Is Partiful free?", answer: `Partiful's help center says its core platform is free, with optional paid extras such as premium invite designs. Eventloom is free to draft and costs ${price} once to publish an event for a year.` },
      { question: "Do guests need a phone number to RSVP?", answer: "On Partiful, guests enter their name and phone number and confirm a texted code. On Eventloom, guests reply from the link without an account or phone verification; you choose whether to ask for a phone number or email." },
      { question: "Can Eventloom text my guests like Partiful?", answer: "No. Eventloom has no text blasts or automatic reminders; you share the link and updates yourself, and the page always shows the latest details. If texting guests matters most, Partiful does it well." },
      { question: "Which is better for a birthday party?", answer: "For a casual party where guests already use Partiful, Partiful is free and social. For a milestone birthday where you want a designed page with schedule, venue, and RSVP in one place, Eventloom is a good fit." },
    ],
    guide: {
      pricing: "Core platform free; optional paid premium designs (prices not published).",
      bestFor: "Casual parties where you want free invites with text blasts and a social feed.",
      watchOut: "Guests must verify a phone number; the invite is a poster-style page rather than a full website.",
    },
    relatedOccasions: ["birthday", "holiday-party", "reunion", "graduation"],
    sources: [
      { label: "Partiful", url: "https://partiful.com/" },
      { label: "Partiful vs Evite (Partiful's page)", url: "https://partiful.com/evite" },
      { label: "Partiful help: Does Partiful cost money?", url: "https://help.partiful.com/hc/en-us/articles/27354376389403-Does-Partiful-cost-money" },
      { label: "Partiful help: Are there fees for free events?", url: "https://help.partiful.com/hc/en-us/articles/49479323273499-Are-there-fees-for-free-events" },
      { label: "Partiful help: How do I RSVP to an event?", url: "https://help.partiful.com/hc/en-us/articles/34230743189787-How-do-I-RSVP-to-an-event-on-Partiful" },
      { label: "Partiful help: What are guest phone numbers used for?", url: "https://help.partiful.com/hc/en-us/articles/26505680245275-What-are-guest-phone-numbers-used-for" },
      { label: "Partiful help: How do I ask questions to my guests?", url: "https://help.partiful.com/hc/en-us/articles/26505707786267-How-do-I-ask-questions-to-my-guests" },
      { label: "Partiful help: Hiding the guest list", url: "https://help.partiful.com/hc/en-us/articles/26503238663195" },
      { label: "Partiful help: Require guest approval", url: "https://help.partiful.com/hc/en-us/articles/26506114782875" },
    ],
    checkedAt: CHECKED_AT,
  },
  {
    slug: "evite",
    name: "Evite",
    domains: ["evite.com"],
    homepage: "https://www.evite.com/",
    category: "Digital invitations",
    oneLiner: "Emailed and texted invitations with reminders, versus a custom event website at one flat price.",
    title: "Eventloom vs Evite: online invitation and RSVP comparison",
    metaDescription: "Eventloom vs Evite, checked October 2026: free with ads vs $20 flat, Premium pricing by guest count, reminders, messaging, and design.",
    verdict: `Evite is the better choice if you want invitations emailed or texted to guests, scheduled reminders, and messages by RSVP group, and its free invitations cost nothing if you accept ads. Eventloom builds a full custom event website with RSVP for ${price} per event, with no ads and no per-guest pricing, but it doesn't send invitations or reminders for you.`,
    rows: [
      { key: "bestFor", competitor: "Hosts who want invitations delivered to inboxes or phones, with reminders and guest messages handled for them." },
      { key: "pricing", competitor: "Free invitations with ads. Premium for one event by guest count: $17.99 (up to 12), $36.99 (30), $68.99 (75), $99.99 (750). Evite Pro: $249.99 a year." },
      { key: "freeOption", competitor: "Yes. Free designs, and free Event Pages for casual invites up to 750 guests." },
      { key: "howBuilt", competitor: "Choose from a template library, upload your own design, or import from Canva." },
      { key: "eventTypes", competitor: "Birthdays, showers, weddings, business events, graduations, celebrations of life, and more." },
      { key: "rsvpQuestions", competitor: "RSVP plus a poll feature for asking guests a question, such as a meal choice." },
      { key: "messaging", competitor: "Message all guests, a group (attending, declined, no reply), or one guest. One automatic reminder plus up to five scheduled reminders by email or SMS." },
      { key: "invitations", competitor: "Digital only, sent by email, text, or shareable link. No printed invitations, though you can print a copy of the design." },
      { key: "mobileApp", competitor: "iPhone and Android apps." },
      { key: "ads", competitor: "Ads appear on free invitations until a Premium fee is paid. Evite Pro has no display ads." },
    ],
    chooseEventloom: [
      "You want a full event website with schedule, venue, and details, not just an invitation card.",
      `You are inviting more than a dozen people and want one flat ${price} price with no ads.`,
      "You want the design made for your event from a description, and to change it by asking.",
      "You are happy to send the link yourself.",
    ],
    chooseCompetitor: [
      "You want invitations sent to guests' inboxes or phones, with scheduled reminders.",
      "You want to message guests by RSVP status.",
      "You want a free option and don't mind ads.",
      "You host often: Evite Pro covers unlimited Premium invitations for a year.",
    ],
    bottomLine: `For a small gathering, Evite's free tier or its $17.99 package for up to 12 guests is hard to argue with. For a bigger guest list, Eventloom's flat ${price} is less than Evite's larger Premium packages, but you handle reminders yourself.`,
    faqs: [
      { question: "How much does Evite cost compared with Eventloom?", answer: `Evite has free invitations with ads. Its Premium packages for one event are priced by guest count, from $17.99 for up to 12 guests to $99.99 for up to 750. Eventloom costs ${price} once per published event regardless of guest count.` },
      { question: "Does Evite show ads?", answer: "Evite's terms say ads appear on free invitations until the Premium fee is paid. Eventloom event sites have no ads." },
      { question: "Can Eventloom send invitations and reminders like Evite?", answer: "No. Eventloom gives you one link to share by text, email, or social, and has no built-in reminders or guest messages. If you want delivery and reminders handled for you, Evite is the better fit." },
      { question: "Which looks more personal?", answer: "Evite offers a large template library, your own uploads, and Canva import. Eventloom generates a full site (layout, colors, fonts, wording) from your description, which you can refine by asking." },
    ],
    guide: {
      pricing: "Free with ads; Premium $17.99–$99.99 per event by guest count; Pro $249.99 a year.",
      bestFor: "Hosts who want invitations delivered by email or text with scheduled reminders.",
      watchOut: "Ads on free invitations, and prices rise with your guest count.",
    },
    relatedOccasions: ["birthday", "baby-shower", "bridal-shower", "graduation", "holiday-party", "retirement"],
    sources: [
      { label: "Evite support: Invitation pricing", url: "https://support.evite.com/pricing-and-billing/pricing-questions/invitation-pricing" },
      { label: "Evite support: Premium pricing", url: "https://support.evite.com/premium/what-is-premium/premium-pricing" },
      { label: "Evite Pro", url: "https://www.evite.com/pro/" },
      { label: "Evite terms of service", url: "https://www.evite.com/content/terms/" },
      { label: "Evite support: Event Pages", url: "https://support.evite.com/products/invitations/create-and-edit/event-pages" },
      { label: "Evite support: Poll feature", url: "https://support.evite.com/products/invitations/create-and-edit/poll-feature" },
      { label: "Evite support: Send a message to guests", url: "https://support.evite.com/products/invitations/manage-and-edit-guest-list/send-a-message-to-guests" },
      { label: "Evite support: Invitation reminders", url: "https://support.evite.com/products/invitations/create-and-edit/invitation-reminder" },
      { label: "Evite support: Print an invitation", url: "https://support.evite.com/products/invitations/general-and-troubleshooting/print-invitation" },
      { label: "Evite: Mobile apps", url: "https://www.evite.com/mobileapps/" },
      { label: "Evite: Design your own", url: "https://www.evite.com/invites/design-your-own/" },
      { label: "Evite", url: "https://www.evite.com/" },
    ],
    checkedAt: CHECKED_AT,
  },
  {
    slug: "paperless-post",
    name: "Paperless Post",
    domains: ["paperlesspost.com"],
    homepage: "https://www.paperlesspost.com/",
    category: "Designer digital invitations",
    oneLiner: "Designer digital cards priced per guest, versus a custom event website at one flat price.",
    title: "Eventloom vs Paperless Post: invitation and RSVP comparison",
    metaDescription: "Eventloom vs Paperless Post, checked October 2026: per-guest pricing vs $20 flat, design, RSVP tracking, messaging, and printed options.",
    verdict: `Paperless Post is the pick when the invitation itself matters most: a large designer catalog of digital cards and textable Flyers, sent by email or text with RSVP tracking and guest messages, plus printed cards through Paper Source. Eventloom is simpler and costs less for bigger lists, a custom event website with RSVP for ${price} per event with no per-guest pricing, but you share the link yourself.`,
    rows: [
      { key: "bestFor", competitor: "Hosts who want a designer invitation delivered by email or text, with tracking and messaging." },
      { key: "pricing", competitor: "Paid per guest: Free ($0), Basic ($0.50), Premium ($1.05), All Access ($1.44). For example, 50 guests on Premium is $52.50. Paperless Pro: $250 a year for 250 guests." },
      { key: "freeOption", competitor: "Yes. The first 50 invitations by email or phone number can be sent without buying anything, using free features." },
      { key: "howBuilt", competitor: "Choose from a large designer catalog of cards and Flyers, or upload your own. An AI tool makes artwork." },
      { key: "eventTypes", competitor: "Birthdays, weddings, baby showers, holidays, and business events." },
      { key: "rsvpQuestions", competitor: "Premium adds guest questions (short answer and mailing address); guest surveys need All Access or Pro." },
      { key: "guestSignIn", competitor: "Guests can RSVP without registering, according to its terms." },
      { key: "messaging", competitor: "Broadcasts and private messages to guests, reminders, and sending by text, email, or shareable link." },
      { key: "invitations", competitor: "Digital cards and Flyers. Printed invitations are sold through Paper Source with a 20-card minimum." },
      { key: "ticketing", competitor: "Guest check-in with a Paperless Pro subscription." },
      { key: "mobileApp", competitor: "App for hosts to track RSVPs and message guests." },
    ],
    chooseEventloom: [
      "You want a full event website, not a card, designed from your description.",
      `Your guest list is large and you'd rather pay ${price} per event than per guest.`,
      "You want to change the page by asking in plain words.",
      "You are happy to send the link yourself.",
    ],
    chooseCompetitor: [
      "The invitation design is the centerpiece and you want a stationery-style card.",
      "You want invitations delivered by email or text, with RSVP tracking and messages to guests.",
      "You want printed invitations too.",
      "Your list is under 50 and the free features cover what you need.",
    ],
    bottomLine: `Paperless Post is the more polished invitation. Eventloom is the more complete event page, and at ${price} flat it costs less than Paperless Post's Premium rate once you invite more than about 19 guests.`,
    faqs: [
      { question: "How does Paperless Post pricing work?", answer: "Paperless Post charges per guest by feature level: Free, Basic ($0.50), Premium ($1.05), and All Access ($1.44). Its own example is $52.50 for 50 guests on Premium. Paperless Pro is $250 a year for 250 guests." },
      { question: "Is Eventloom cheaper than Paperless Post?", answer: `For larger lists, usually. Eventloom is ${price} once per published event regardless of guest count. For a list of up to 50 using only free features, Paperless Post can cost nothing.` },
      { question: "Can Eventloom send invitations by email or text?", answer: "No. Eventloom gives you a link to share however you like and has no built-in delivery, reminders, or messages. Paperless Post handles delivery and messaging for you." },
      { question: "Does either offer printed invitations?", answer: "Paperless Post sells printed invitations through Paper Source with a 20-card minimum. Eventloom does not offer paper invitations." },
    ],
    guide: {
      pricing: "Per guest: Free, Basic $0.50, Premium $1.05, All Access $1.44; Pro $250 a year.",
      bestFor: "Hosts who want a designer invitation sent by email or text, with printed cards as an option.",
      watchOut: "Costs scale with your guest list; it's an invitation first, not a full event website.",
    },
    relatedOccasions: ["wedding", "birthday", "baby-shower", "bridal-shower", "holiday-party"],
    sources: [
      { label: "Paperless Post: Pricing", url: "https://www.paperlesspost.com/pricing" },
      { label: "Paperless Post: Features", url: "https://www.paperlesspost.com/features" },
      { label: "Paperless Post: Flyer", url: "https://www.paperlesspost.com/flyer" },
      { label: "Paperless Post: RSVP website", url: "https://www.paperlesspost.com/rsvp-website" },
      { label: "Paperless Post: Terms of service", url: "https://www.paperlesspost.com/terms-of-service" },
      { label: "Paperless Post: Printed invitations", url: "https://www.paperlesspost.com/paper/info/flatprinting" },
    ],
    checkedAt: CHECKED_AT,
  },
  {
    slug: "rsvpify",
    name: "RSVPify",
    domains: ["rsvpify.com"],
    homepage: "https://rsvpify.com/",
    category: "RSVP and event registration software",
    oneLiner: "Registration, check-in, and ticketing software on subscriptions, versus a one-time custom event website.",
    title: "Eventloom vs RSVPify: RSVP and event registration comparison",
    metaDescription: "Eventloom vs RSVPify, checked October 2026: $20 one-time vs plans, custom questions, check-in, ticketing, email, and which event suits each.",
    verdict: `RSVPify is the stronger tool for professional and larger events: custom questions, sub-events, email invitations and reminders, seating charts, QR check-in, and ticketing, on a free plan or monthly and annual subscriptions. Eventloom is the simpler choice for a personal event that needs a well-designed page and a straightforward RSVP, at ${price} once with no subscription, but it has no check-in, ticketing, or email tools.`,
    rows: [
      { key: "bestFor", competitor: "Corporate events, galas, conferences, and detailed personal events that need registration and day-of tools." },
      { key: "pricing", competitor: "Personal: Free (up to 100 guests), Gold $10/month or $72/year (300 guests), Platinum $15/month or $108/year (500 guests); prices may vary by event type. Business: Free, then Starter $39, Plus $125, Professional $409 a month (less when billed yearly)." },
      { key: "freeOption", competitor: "Yes. One event at a time with up to 100 invited guests; custom questions and plus-ones need a paid plan." },
      { key: "howBuilt", competitor: "Drag-and-drop event website builder that can be embedded in Wix, Squarespace, or WordPress. An AI assistant (Cue) creates events from instructions and drafts emails." },
      { key: "eventTypes", competitor: "Corporate events, conferences, galas, nonprofits, weddings, birthdays, bar and bat mitzvahs, quinceañeras, memorials, and more." },
      { key: "rsvpQuestions", competitor: "Unlimited custom questions on paid plans, meal choices, plus-ones, secondary events, invite-only guest lists, and data export." },
      { key: "messaging", competitor: "Email invitations, save-the-dates, reminders, and blasts with open tracking." },
      { key: "ticketing", competitor: "Ticket sales (1.95% + $0.90 per ticket plus Stripe fees), seating charts, and QR check-in on higher business plans." },
      { key: "mobileApp", competitor: "An iOS check-in app for event staff." },
      { key: "ads", competitor: "Removing RSVPify branding and the ad-free guest experience are Enterprise features on business plans." },
    ],
    chooseEventloom: [
      "You are hosting a personal event and want a designed website, not a registration form.",
      `You'd rather pay ${price} once than subscribe monthly or yearly.`,
      "You don't need check-in, tickets, seating charts, or email campaigns.",
      "You want the page drafted in seconds from a description.",
    ],
    chooseCompetitor: [
      "You need custom questions, sub-events, or plus-one rules beyond fixed fields.",
      "You are running a corporate event, gala, or conference with check-in or ticket sales.",
      "You want to send email invitations and reminders and track opens.",
      "You need seating charts or CRM integrations.",
    ],
    bottomLine: "RSVPify is event operations software; Eventloom is an event website with an RSVP. Pick by how much you need to manage on the day.",
    faqs: [
      { question: "How much does RSVPify cost?", answer: "RSVPify has a free plan. Its personal plans are Gold at $10 a month or $72 a year and Platinum at $15 a month or $108 a year, and its business plans start at $39 a month. Prices may vary by event type." },
      { question: "Is Eventloom a subscription?", answer: `No. Eventloom is free to draft and costs ${price} once to publish one event for a year. There is no monthly plan.` },
      { question: "Does Eventloom have check-in or ticketing?", answer: "No. Eventloom has no ticket sales, seating charts, or check-in. RSVPify is built for those." },
      { question: "Which is better for a corporate event?", answer: "For conferences, galas, or anything with tickets, check-in, or badges, RSVPify. For a small team dinner or holiday party that just needs a good-looking page and a headcount, Eventloom is simpler." },
    ],
    guide: {
      pricing: "Free plan; personal from $10 a month or $72 a year; business from $39 a month.",
      bestFor: "Corporate and larger events that need custom questions, email, check-in, or tickets.",
      watchOut: "Subscription pricing, and many features sit on higher tiers.",
    },
    relatedOccasions: ["corporate-event", "wedding", "quinceanera", "bar-bat-mitzvah", "memorial"],
    sources: [
      { label: "RSVPify: Business and nonprofit pricing", url: "https://rsvpify.com/pricing/" },
      { label: "RSVPify: Personal events pricing", url: "https://rsvpify.com/pricing/personal-events/" },
      { label: "RSVPify: Selling tickets pricing", url: "https://rsvpify.com/pricing/selling-tickets/" },
      { label: "RSVPify: Event website builder", url: "https://rsvpify.com/event-website-builder/" },
      { label: "RSVPify: AI", url: "https://rsvpify.com/ai/" },
      { label: "RSVPify: Event emails", url: "https://rsvpify.com/event-emails/" },
      { label: "RSVPify: Menu options", url: "https://rsvpify.com/menu-options/" },
      { label: "RSVPify: Seating chart maker", url: "https://rsvpify.com/seating-chart-maker/" },
      { label: "RSVPify help: Check-in app", url: "https://help.rsvpify.com/en/articles/5304998" },
    ],
    checkedAt: CHECKED_AT,
  },
];

export function getCompetitor(slug: string) {
  return competitors.find((competitor) => competitor.slug === slug) ?? null;
}

/** "2026-10-08" -> "October 8, 2026" (UTC, so the date never shifts by time zone). */
export function formatCheckedDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** "2026-10-08" -> "October 2026". */
export function formatCheckedMonth(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
}

export function latestCheckedAt() {
  return competitors.map((competitor) => competitor.checkedAt).sort().at(-1) ?? CHECKED_AT;
}

/** Comparison links worth showing next to an occasion template or landing page (keyed by occasion slug or event type). */
export function comparisonLinksFor(key: string): { href: string; label: string }[] {
  const relevant = competitors.filter((competitor) => competitor.relatedOccasions.includes(key)).slice(0, 3);
  return [
    ...relevant.map((competitor) => ({ href: comparePath(competitor.slug), label: `Eventloom vs ${competitor.name}` })),
    { href: GUIDE_PATH, label: "Best RSVP website builders" },
  ];
}

export const compareHubCopy = {
  title: "Eventloom vs other RSVP and event website tools",
  metaDescription: "Honest, sourced comparisons of Eventloom with Zola, The Knot, Joy, Partiful, Evite, Paperless Post, and RSVPify, including where each one is better.",
  heading: "How Eventloom compares with other RSVP tools.",
  summary: `Eventloom is an AI event website and RSVP builder: describe your event and it drafts a custom site with an RSVP form in seconds, free to draft and ${price} once to publish. Wedding platforms like Zola, The Knot, and Joy are free and include registries; Partiful, Evite, and Paperless Post send invitations and reminders; RSVPify handles registration, check-in, and tickets. Each comparison below says plainly where the other tool is the better choice.`,
  does: [
    "Builds a custom event website with RSVP from a short description, in seconds.",
    "Lets you edit visually or by asking for changes in plain words.",
    "Works for any occasion, from weddings to memorials to team dinners.",
    "Lets guests reply from one link without an account.",
    `Costs ${price} once per published event for a year, with no subscription or ads.`,
  ],
  doesNot: [
    "Offer a registry or cash fund.",
    "Send invitations, reminders, emails, or text blasts to guests.",
    "Print paper invitations.",
    "Have a native mobile app.",
    "Sell tickets, make seating charts, or run check-in.",
    "Offer a custom question builder beyond its built-in RSVP fields and a free-text note.",
  ],
  faqs: [
    { question: "What is Eventloom?", answer: `Eventloom is an AI event website and RSVP builder. You describe an event in a sentence and it drafts a custom website with a built-in RSVP form, which you can edit visually or by asking. Drafting is free; publishing costs ${price} once per event for a year.` },
    { question: "What is the best free alternative to Eventloom?", answer: "For weddings, Joy, Zola, and The Knot offer free wedding websites with RSVP. For casual parties, Partiful's core platform is free. Evite has free invitations with ads, and RSVPify has a free plan for up to 100 guests." },
    { question: "How were these comparisons made?", answer: "Every competitor detail comes from that company's own pricing, product, or help pages, listed as sources on each comparison with the date we checked them. If we couldn't confirm something on their site, we left it out." },
  ],
} as const;

export const guideCopy = {
  title: "Best RSVP Website Builders in 2026",
  metaTitle: "Best RSVP website builders in 2026: honest picks by event type",
  metaDescription: "The best RSVP website builders for weddings, parties, corporate events, and free options, with prices checked on each company's site in October 2026.",
  heading: "The best RSVP website builders, by the event you're hosting.",
  summary: `For weddings, Joy, Zola, and The Knot are free and include registries, so they suit most couples. For casual parties, Partiful is free with text updates, while Evite and Paperless Post are best when you want invitations sent and reminders scheduled for you. For corporate events with check-in or tickets, RSVPify is the most complete of the tools here. Eventloom, which publishes this guide, is the pick when you want an AI-built custom event website with RSVP for any occasion at a flat ${price} per event.`,
  useCases: [
    {
      id: "weddings",
      title: "Weddings",
      intro: "Wedding platforms are free because they earn from registries, stationery, and vendors. If you want a registry, start here.",
      picks: [
        { slug: "joy", why: "Free website, RSVP with custom and private questions, guest app, and registry." },
        { slug: "zola", why: "Free website with per-event RSVPs, a registry, and matching paper invitations." },
        { slug: "the-knot", why: "Free website with a universal registry and a large vendor marketplace." },
      ],
      eventloom: "Choose Eventloom if you want a site designed from your description instead of a template, and don't need a registry.",
    },
    {
      id: "parties",
      title: "Birthdays and parties",
      intro: "For parties, the question is whether you want invitations and reminders sent for you, or one link you share yourself.",
      picks: [
        { slug: "partiful", why: "Free, social, and phone-first, with text blasts and reminders." },
        { slug: "evite", why: "Invitations sent by email or text, with scheduled reminders; free with ads." },
        { slug: "paperless-post", why: "Designer cards and Flyers sent by email or text, priced per guest." },
      ],
      eventloom: `Choose Eventloom for a milestone birthday or any party where you want a full designed page with schedule, venue, and RSVP, at ${price} flat with no ads.`,
    },
    {
      id: "corporate",
      title: "Corporate and organization events",
      intro: "Work events often need registration, email, and day-of tools, which is where dedicated software earns its subscription.",
      picks: [
        { slug: "rsvpify", why: "Custom questions, sub-events, email campaigns, seating charts, QR check-in, and ticketing." },
        { slug: "evite", why: "Evite Pro covers unlimited Premium invitations for a year, with logo upload and co-hosts." },
        { slug: "paperless-post", why: "Paperless Pro adds custom URLs and guest check-in for frequent hosts." },
      ],
      eventloom: "Choose Eventloom for a small team dinner, offsite, or holiday party that just needs a polished page and a headcount, without a subscription.",
    },
    {
      id: "free",
      title: "Free options",
      intro: "Several tools let you publish without paying anything. Eventloom is not one of them.",
      picks: [
        { slug: "joy", why: "Free wedding website, RSVP, app, and registry." },
        { slug: "partiful", why: "Free core platform for parties, with no ads." },
        { slug: "rsvpify", why: "Free plan for one event at a time with up to 100 invited guests." },
      ],
      eventloom: `Eventloom is free to draft and preview, but publishing costs ${price} once per event. Zola and The Knot also offer free wedding websites, Evite has free invitations with ads, and Paperless Post lets you send your first 50 invitations free.`,
    },
  ],
  eventloomEntry: {
    pricing: `Free to draft; ${price} once per published event for a year.`,
    bestFor: "Hosts who want a custom-designed event website with RSVP for any occasion, made in minutes.",
    watchOut: "No registry, guest messaging, paper invitations, mobile app, or custom question builder.",
  },
  faqs: [
    { question: "What is the best RSVP website builder?", answer: `It depends on the event. For weddings, Joy, Zola, and The Knot are free and include registries. For casual parties, Partiful is free; Evite and Paperless Post send invitations and reminders. For corporate events, RSVPify has check-in and ticketing. For a custom-designed event website for any occasion at ${price} flat, Eventloom.` },
    { question: "What is the best free RSVP website?", answer: "For weddings, Joy, Zola, and The Knot offer free websites with online RSVP. For parties, Partiful's core platform is free. RSVPify's free plan covers one event with up to 100 invited guests, and Evite's free invitations include ads." },
    { question: "Which RSVP tool doesn't require guests to make an account?", answer: "Eventloom guests reply from the link with no account or phone verification. Joy says guests don't need an account to RSVP in a browser, and Paperless Post's terms say guests can RSVP without registering. Partiful asks guests for a phone number confirmed with a texted code." },
    { question: "Which RSVP tools can text my guests?", answer: "Partiful has free text blasts, Evite sends reminders by email or SMS, Paperless Post sends by text or email, and Joy offers texting as a paid add-on. Eventloom does not send messages; you share the link yourself." },
    { question: "Is this guide biased toward Eventloom?", answer: "Eventloom publishes it, so read it with that in mind. We recommend other tools wherever they fit better, and every competitor fact links to that company's own page with the date we checked it." },
  ],
} as const;

/** The tools in the order the guide reviews them: every competitor, then Eventloom (the publisher) last. */
export function guideItems() {
  return [
    ...competitors.map((competitor) => ({ name: competitor.name, path: comparePath(competitor.slug) })),
    { name: "Eventloom", path: "/" },
  ];
}

const ogImage = { url: "/opengraph-image", width: 1200, height: 630, alt: "Eventloom event websites with online RSVPs" };

function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", title, description, url: path, siteName: "Eventloom", images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage.url] },
  };
}

export function competitorMetadata(competitor: Competitor): Metadata {
  return pageMetadata(competitor.title, competitor.metaDescription, comparePath(competitor.slug));
}

export function compareHubMetadata(): Metadata {
  return pageMetadata(`${compareHubCopy.title} | Eventloom`, compareHubCopy.metaDescription, COMPARE_PATH);
}

export function guideMetadata(): Metadata {
  return pageMetadata(guideCopy.metaTitle, guideCopy.metaDescription, GUIDE_PATH);
}
