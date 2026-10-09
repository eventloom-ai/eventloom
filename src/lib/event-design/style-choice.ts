import { DESIGN_STYLES, pickPalette, type StyleKey } from "@/lib/event-design/styles";

/**
 * Deterministic art direction: which approved style and palette an event gets, from its kind and the mood the
 * host picked. Used by the build fallback, the art director's guard rails and the template gallery samples.
 */

/** The mood chips offered in the build intake (site-build-studio), also used by the template gallery. */
export const DESIGN_MOODS = ["blush", "navy", "gold", "lavender", "forest", "sunset"] as const;
export type DesignMood = (typeof DESIGN_MOODS)[number];

export type DesignKind = "wedding" | "shower" | "birthday" | "kids" | "corporate" | "formal" | "memorial" | "other";

/** Which palette of each style a mood maps to (every style has two palettes; a mood picks the closer one). */
export const MOOD_PALETTE: Record<StyleKey, Record<DesignMood, string>> = {
  editorial: { blush: "newsprint", navy: "riviera", gold: "newsprint", lavender: "riviera", forest: "newsprint", sunset: "newsprint" },
  romantic: { blush: "blush", navy: "sage", gold: "blush", lavender: "blush", forest: "sage", sunset: "blush" },
  minimal: { blush: "signal", navy: "cobalt", gold: "signal", lavender: "cobalt", forest: "cobalt", sunset: "signal" },
  playful: { blush: "sherbet", navy: "lagoon", gold: "sherbet", lavender: "sherbet", forest: "lagoon", sunset: "sherbet" },
  noir: { blush: "gilded", navy: "gilded", gold: "gilded", lavender: "gilded", forest: "emerald", sunset: "gilded" },
};

/** The style each kind of event gets, per mood ("default" when the host picked none). */
export const STYLE_FOR_KIND: Record<DesignKind, Record<DesignMood | "default", StyleKey>> = {
  wedding: { default: "romantic", blush: "romantic", navy: "editorial", gold: "noir", lavender: "romantic", forest: "romantic", sunset: "editorial" },
  shower: { default: "romantic", blush: "romantic", navy: "editorial", gold: "editorial", lavender: "playful", forest: "romantic", sunset: "playful" },
  birthday: { default: "playful", blush: "playful", navy: "editorial", gold: "noir", lavender: "playful", forest: "playful", sunset: "playful" },
  kids: { default: "playful", blush: "playful", navy: "playful", gold: "playful", lavender: "playful", forest: "playful", sunset: "playful" },
  corporate: { default: "minimal", blush: "minimal", navy: "minimal", gold: "minimal", lavender: "minimal", forest: "editorial", sunset: "minimal" },
  formal: { default: "noir", blush: "noir", navy: "noir", gold: "noir", lavender: "noir", forest: "noir", sunset: "noir" },
  memorial: { default: "romantic", blush: "romantic", navy: "editorial", gold: "editorial", lavender: "romantic", forest: "romantic", sunset: "editorial" },
  other: { default: "editorial", blush: "romantic", navy: "editorial", gold: "noir", lavender: "playful", forest: "romantic", sunset: "playful" },
};

const MEMORIAL = /memorial|funeral|celebration of life|remembrance|\bwake\b|in loving memory/i;
const SHOWER = /baby shower|bridal shower|sip (?:and|&|n) see|gender reveal|baby sprinkle|\bshower\b/i;
const KIDS = /\bkids?\b|children'?s (?:party|birthday)|toddler|\bfirst birthday|\b(?:[1-9]|1[0-2])(?:st|nd|rd|th) birthday|\bturns? (?:[1-9]|1[0-2])\b(?!\d)/i;
const FORMAL = /black[- ]?tie|white[- ]?tie|\bgala\b|formal (?:dinner|evening|event|affair|celebration|wedding|party)|awards? (?:night|ceremony|dinner)|new year'?s eve|\bnye\b|fundraising dinner|^formal$/i;
const WEDDING = /wedding|engagement|anniversary|nikah|nikkah|vow renewal|elopement|rehearsal dinner|زفاف|خطوبة|عرس/i;
const BIRTHDAY = /birthday|\bbday\b|\bturns? \d{1,3}\b|عيد ميلاد/i;
const CORPORATE = /corporate|conference|summit|offsite|off-site|retreat|company|\bteam\b|launch|meetup|workshop|networking|seminar|webinar|town hall|all[- ]hands|hackathon|product|client|investor/i;

function kindOf(text: string): DesignKind {
  if (MEMORIAL.test(text)) return "memorial";
  if (SHOWER.test(text)) return "shower";
  if (KIDS.test(text)) return "kids";
  if (FORMAL.test(text)) return "formal";
  if (WEDDING.test(text)) return "wedding";
  if (BIRTHDAY.test(text)) return "birthday";
  if (CORPORATE.test(text)) return "corporate";
  return "other";
}

/** The event's kind for design purposes: its type first, then the brief (fallback configs say only "event"). */
export function designKind(eventType: string, prompt = ""): DesignKind {
  const byType = kindOf(eventType);
  // A formal cue anywhere (a black-tie wedding, a gala birthday) wins over the plain type, but never for kids or memorials.
  if (byType !== "kids" && byType !== "memorial" && FORMAL.test(prompt)) return "formal";
  return byType === "other" ? kindOf(prompt) : byType;
}

export function isDesignMood(value: unknown): value is DesignMood {
  return typeof value === "string" && (DESIGN_MOODS as readonly string[]).includes(value.trim().toLowerCase());
}

/** The mood the host picked: the intake chip first, then the config's mood, then a mood word in the brief. */
export function detectMood(prompt: string, ...explicit: (string | undefined | null)[]): DesignMood | null {
  for (const value of explicit) if (isDesignMood(value)) return value.trim().toLowerCase() as DesignMood;
  const match = prompt.toLowerCase().match(new RegExp(`\\b(${DESIGN_MOODS.join("|")})\\b`));
  return match ? (match[1] as DesignMood) : null;
}

/** Palette for a style: the mood's palette when the host picked one, otherwise palette hints in the brief, otherwise the style's first. */
export function paletteFor(styleKey: StyleKey, mood: DesignMood | null, hintText = "") {
  return mood ? MOOD_PALETTE[styleKey][mood] : pickPalette(DESIGN_STYLES[styleKey], hintText).key;
}

/** Deterministic style + palette for an event: by kind of event and the mood the host picked. */
export function chooseDesignStyle(input: { eventType: string; prompt?: string; mood?: DesignMood | null }): { styleKey: StyleKey; paletteKey: string; kind: DesignKind } {
  const kind = designKind(input.eventType, input.prompt ?? "");
  const mood = input.mood ?? null;
  const styleKey = STYLE_FOR_KIND[kind][mood ?? "default"];
  return { styleKey, paletteKey: paletteFor(styleKey, mood, input.prompt ?? ""), kind };
}
