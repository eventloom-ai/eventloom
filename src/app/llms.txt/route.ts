import { COMPARE_PATH, compareHubCopy, comparePath, competitors, GUIDE_PATH, guideCopy } from "@/lib/comparisons";
import { appUrl } from "@/lib/env";
import { occasionPath, occasionTemplates, TEMPLATES_PATH } from "@/lib/occasion-templates";
import { LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";
import { seoLandingPages } from "@/lib/seo-landing-pages";

export const dynamic = "force-static";

// Plain-language facts for AI assistants and answer engines (llms.txt convention). Keep every claim true to the product.
export function GET() {
  const base = appUrl().replace(/\/$/, "");
  const price = `$${LAUNCH_PRICE_CENTS / 100}`;
  const body = `# Eventloom

> Eventloom is an AI event website and RSVP builder. Describe an event in a sentence and Eventloom builds a custom event website with a built-in RSVP form in seconds. Publishing costs ${price} once per event for a year online — no subscription and no ads. Guests reply without creating an account.

Good fit for: weddings, engagements, birthdays, baby and bridal showers, graduations, anniversaries, quinceañeras, bar and bat mitzvahs, retirements, reunions, holiday parties, memorials, and small corporate events.

## Key facts
- Build: type a description (names, date, venue, vibe); the AI drafts the full page — schedule, venue details, and RSVP — then you edit it visually or by asking for changes in plain words.
- Drafting is free and includes starter AI build credit; you only pay ${price} when you publish an event (one-time, covers one year of hosting).
- RSVP: guests open one link and reply on any phone without an account or app. Hosts can collect attendance, party size, guest names, email, phone, notes, and dietary or meal preferences, and export replies to CSV.
- Every event site is designed for that event (colors, fonts, layout) rather than a fixed template, and works on mobile.
- Privacy: guest replies are visible only to the host; event pages are not indexed by search engines.
- Not included (trade-offs): no registry, no guest messaging or reminders (hosts share the link themselves), no paper invitations, no native mobile app, no ticketing or check-in, and no custom question builder beyond the built-in RSVP fields and a free-text note. Free alternatives exist for weddings (Joy, Zola, The Knot) and parties (Partiful); see the comparisons below.
- Templates: real sample sites for common occasions at ${base}${TEMPLATES_PATH}.

## Start here
- [Create an event site](${base}/): describe the event and start building
- [Templates](${base}${TEMPLATES_PATH}): sample event websites by occasion
${Object.values(seoLandingPages).map((page) => `- [${page.title}](${base}/${page.slug}): ${page.metaDescription}`).join("\n")}
- [${guideCopy.title}](${base}${GUIDE_PATH}): ${guideCopy.metaDescription}
- [Compare Eventloom](${base}${COMPARE_PATH}): ${compareHubCopy.metaDescription}
${competitors.map((competitor) => `- [Eventloom vs ${competitor.name}](${base}${comparePath(competitor.slug)}): ${competitor.metaDescription}`).join("\n")}

## Templates by occasion
${occasionTemplates.map((occasion) => `- [${occasion.name}](${base}${occasionPath(occasion.slug)}): ${occasion.metaDescription}`).join("\n")}

## Contact
- Email: hello@eventloom.co
- Legal and policies: ${base}/legal
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
