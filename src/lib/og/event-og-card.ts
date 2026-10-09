import { designEventSite, designSiteFromConfig } from "@/lib/event-design/design-event-site";
import { chooseDesignStyle, detectMood } from "@/lib/event-design/style-choice";
import { DESIGN_STYLES, pickPalette, type StyleKey } from "@/lib/event-design/styles";
import type { EventSiteDesign } from "@/lib/event-design/types";
import type { EventConfig, EventRecord } from "@/lib/types";

/** Bump when the card's drawing changes, so share caches keyed by the image URL pick up the new look. */
const OG_CARD_VERSION = 1;

/** The id of the image used when there is no event card to draw (missing, draft, archived or unsupported script). */
export const GENERIC_OG_IMAGE_ID = "default";

/**
 * Everything the share card draws. Built only from what the public page already shows in its opening section:
 * no guest data, no hidden fields, no host details.
 */
export type EventOgCard = {
  styleKey: StyleKey;
  colors: { bg: string; ink: string; muted: string; accentText: string; line: string; accent: string; pops: string[] };
  eyebrow: string;
  title: string;
  coupleNames: [string, string] | null;
  /** Date and venue city, in that order, each only when it is known. */
  details: string[];
};

const TBA = /to be announced|\btba\b|\btbd\b|shared with invited guests/i;
// Emoji and their joiners/selectors are dropped: rendering them would fetch emoji art from a third-party CDN.
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍︎️⃣]/gu;
// The card's fonts cover Latin scripts and common punctuation. Anything else (Arabic, CJK, …) gets the generic card.
const UNSUPPORTED = /[^\u0000-ɏḀ-ỿ -⁯₠-₿℀-⅏]/u;

function clean(value: string | undefined, max: number) {
  const text = (value ?? "").normalize("NFC").replace(EMOJI, "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/[\s,.;:·–—-]+\S*$/, "").trimEnd()}…`;
}

const UNIT = /\b(?:apt|apartment|suite|ste|unit|floor|fl|room|rm|building|bldg|po box|upstairs|downstairs|basement|rooftop|entrance|gate|level|lobby|rear)\b|#/i;

/**
 * The city of a venue address ("214 Orchard Hill Road, Hudson, NY 12534" → "Hudson, NY"): the street line, unit
 * lines, postcodes and anything else with a number are left out, so a share card never carries a street address.
 */
export function venueCity(address: string | undefined) {
  if (!address || TBA.test(address)) return "";
  const parts = address.split(",").map((part) => part.split(/\s+/).filter((word) => !/\d/.test(word)).join(" ").trim());
  // Place names are capitalized; lowercase leftovers are directions ("upstairs", "round the back").
  const rest = (parts.length > 1 ? parts.slice(1) : parts).filter((part) => /^\p{Lu}/u.test(part) && !UNIT.test(part));
  if (!rest.length) return "";
  const [city, region] = rest;
  return region && /^[A-Z]{2,3}$/.test(region) ? `${city}, ${region}` : city;
}

/** The share card for a designed site: its opening section's words, in the hero's own palette tone. */
export function ogCardFromDesign(design: EventSiteDesign, overrides: { eyebrow?: string } = {}): EventOgCard | null {
  const hero = design.sections.find((section) => section.kind === "hero");
  if (!hero || hero.kind !== "hero") return null;
  const palette = pickPalette(DESIGN_STYLES[design.styleKey], "", design.paletteKey);
  const tone = palette.tones[hero.tone] ?? palette.tones.base;
  const { props } = hero;
  const coupleNames = props.coupleNames ? [clean(props.coupleNames[0], 28), clean(props.coupleNames[1], 28)] as [string, string] : null;
  const title = clean(props.title, 72);
  const date = TBA.test(props.date.raw) ? "" : clean(props.date.dateLabel, 48);
  const details = design.sections.find((section) => section.kind === "details");
  const venueName = TBA.test(props.venueName) ? "" : props.venueName;
  // The venue's city; failing that its name (shown large on the page). Never the street address.
  const place = clean(venueCity(details?.kind === "details" ? details.props.venueAddress : undefined) || venueName, 40);
  const card: EventOgCard = {
    styleKey: design.styleKey,
    colors: { bg: tone.bg, ink: tone.ink, muted: tone.muted, accentText: tone.accentText, line: tone.line, accent: palette.accent, pops: palette.pops },
    eyebrow: clean(overrides.eyebrow ?? props.eyebrow, 48),
    title,
    coupleNames: coupleNames && coupleNames[0] && coupleNames[1] ? coupleNames : null,
    details: [date, place].filter(Boolean),
  };
  if (!card.title) return null;
  const words = [card.eyebrow, card.title, ...(card.coupleNames ?? []), ...card.details].join(" ");
  return UNSUPPORTED.test(words) ? null : card;
}

/** Events created before designed sites still get a card: their kind and mood pick the same style a new event would. */
function legacyDesign(config: EventConfig): EventSiteDesign {
  const { styleKey, paletteKey } = chooseDesignStyle({ eventType: config.eventType, prompt: config.subtitle, mood: detectMood("", config.theme.mood) });
  return designEventSite(config, styleKey, {}, { paletteKey });
}

/**
 * The share card for a guest page, or null when the generic Eventloom image must be used instead. Only a published
 * event gets its own card: drafts (demo mode resolves them), archived and missing events never reveal their details.
 */
export function eventOgCard(event: EventRecord | null | undefined): EventOgCard | null {
  if (!event || event.status !== "published") return null;
  return ogCardFromDesign(designSiteFromConfig(event.config) ?? legacyDesign(event.config));
}

/** 32-bit FNV-1a, enough to tell published versions of one card apart. */
function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * The image URL segment for a card. It changes whenever anything drawn on the card changes (a new published version
 * with a new title, date, venue or palette), so the image can be cached hard and share previews still refresh.
 */
export function ogImageId(card: EventOgCard | null) {
  return card ? `v${OG_CARD_VERSION}-${fnv1a(JSON.stringify(card))}` : GENERIC_OG_IMAGE_ID;
}

export function ogImageAlt(card: EventOgCard | null) {
  if (!card) return "Eventloom event websites with online RSVPs";
  const name = card.coupleNames ? `${card.coupleNames[0]} & ${card.coupleNames[1]}` : card.title;
  return [name, ...card.details].join(" · ");
}
