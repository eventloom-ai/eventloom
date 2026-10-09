import { aiCallTimeoutMs } from "@/lib/ai/deadline";
import { EVENT_DESIGN_VERSION, REQUIRED_SECTIONS, SECTION_KEYS, SECTION_VARIANTS, eventDesignSchema, type EventDesign, type SectionKey } from "@/lib/event-design/schema";
import { MOOD_PALETTE, STYLE_FOR_KIND, chooseDesignStyle, detectMood, paletteFor, type DesignKind, type DesignMood } from "@/lib/event-design/style-choice";
import { DESIGN_STYLES, STYLE_KEYS, type StyleKey } from "@/lib/event-design/styles";
import type { EventDesignContent } from "@/lib/event-design/types";
import { env, openaiResponsesOptions } from "@/lib/env";
import { stripVisualDirection } from "@/lib/event-theme";
import type { EventConfig } from "@/lib/types";

/**
 * The "art director" step of a build: picks one of the approved styles and palettes for the event and writes
 * the page copy the section library needs. It only ever chooses from closed sets; it never outputs colors,
 * sizes or layout. Without a provider (or on failure/timeout) a deterministic mapping does the same job.
 */

const DRESS_CODE = /(?:dress code|attire)\s*(?:is|:|-|–)?\s*([^.\n;]{3,90})/i;
const DRESS_CUES: Array<[RegExp, string]> = [
  [/white[- ]tie/i, "White tie"],
  [/black[- ]tie optional/i, "Black tie optional"],
  [/black[- ]tie/i, "Black tie"],
  [/cocktail attire/i, "Cocktail attire"],
];

/** A dress code only when the host stated one, in their words. */
export function dressCodeFromBrief(prompt: string): string | undefined {
  const stated = prompt.match(DRESS_CODE)?.[1]?.trim().replace(/^["“]|["”]$/g, "");
  if (stated) return stated.charAt(0).toUpperCase() + stated.slice(1);
  return DRESS_CUES.find(([pattern]) => pattern.test(prompt))?.[1];
}

/**
 * Copy for the deterministic path. It never invents facts: no names, dates, venues, policies, travel or story the
 * host didn't give. Optional sections without real content are left out; headings fall back to the style's defaults.
 */
export function fallbackDesignContent(prompt: string): EventDesignContent {
  const dressCode = dressCodeFromBrief(prompt);
  return dressCode ? { dressCode: { body: dressCode } } : {};
}

export function fallbackEventDesign(input: { config: EventConfig; prompt: string; mood?: string | null }): EventDesign {
  const mood = detectMood(input.prompt, input.mood, input.config.theme.mood);
  const { styleKey, paletteKey } = chooseDesignStyle({ eventType: input.config.eventType, prompt: input.prompt, mood });
  return { version: EVENT_DESIGN_VERSION, styleKey, paletteKey, content: fallbackDesignContent(input.prompt) };
}

/* Grounding: the AI's copy is kept only where the brief supports it ------------------------------------------------ */

const STOP = new Set(["the", "and", "for", "with", "your", "you", "our", "are", "will", "this", "that", "from", "have", "please", "event", "guests", "guest", "there", "their", "about", "into", "more", "what", "when", "where", "been", "they", "them", "just", "also", "very", "make", "sure"]);

function tokens(value: string) {
  return value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 3 && !STOP.has(token));
}

/**
 * True when the copy shares a meaningful word with the brief. Words that are just the event's own name, venue or
 * address don't count: "Free parking behind Rose Court" is not supported by a brief that only names Rose Court.
 */
function supported(value: string, prompt: string, known = "") {
  const haystack = prompt.toLowerCase();
  const ignore = new Set(tokens(known));
  return tokens(value).some((token) => !ignore.has(token) && haystack.includes(token));
}

/** Any number in generated copy (a date, a time, a count, a price) must come from the host's own words. */
function numbersGrounded(value: string, facts: string) {
  return (value.match(/\d+/g) ?? []).every((number) => facts.includes(number));
}

const clean = (value: unknown, max: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
};

type RawContent = Record<string, unknown>;

/** Turns the model's content into stored copy, dropping anything the brief does not support. */
export function groundDesignContent(raw: RawContent, enrichedPrompt: string, config: EventConfig): EventDesignContent {
  // The mood instruction appended to the brief is not a fact guests should read.
  const prompt = stripVisualDirection(enrichedPrompt);
  const facts = `${prompt}\n${config.title}\n${config.subtitle}\n${config.date}\n${config.venueName}\n${config.venueAddress ?? ""}\n${config.rsvpDeadline ?? ""}\n${config.schedule.map((item) => `${item.title} ${item.time} ${item.location ?? ""} ${item.description ?? ""}`).join("\n")}`;
  const copy = (value: unknown, max: number) => {
    const text = stripVisualDirection(clean(value, max) ?? "");
    return text && numbersGrounded(text, facts) ? text : undefined;
  };
  const known = `${config.title} ${config.venueName} ${config.venueAddress ?? ""} ${config.eventType}`;
  const content: EventDesignContent = {};
  const set = <K extends keyof EventDesignContent>(key: K, value: EventDesignContent[K] | undefined) => {
    if (value !== undefined) content[key] = value;
  };

  set("eyebrow", copy(raw.eyebrow, 80));
  set("detailsHeading", copy(raw.detailsHeading, 80));
  set("scheduleHeading", copy(raw.scheduleHeading, 80));
  set("galleryHeading", copy(raw.galleryHeading, 80));
  set("goodToKnowHeading", copy(raw.goodToKnowHeading, 80));
  set("rsvpHeading", copy(raw.rsvpHeading, 80));
  set("rsvpDescription", copy(raw.rsvpDescription, 300));
  set("closingLine", copy(raw.closingLine, 160));

  // A dress code is a fact: only when the brief states one.
  const dress = copy(raw.dressCode, 300);
  if (dress && /dress|attire|black[- ]?tie|white[- ]?tie|cocktail|casual|formal|costume|\bwear\b/i.test(prompt)) set("dressCode", { body: dress });

  // A story must retell the brief, not invent one.
  const story = raw.story && typeof raw.story === "object" ? raw.story as RawContent : null;
  if (story) {
    const heading = copy(story.heading, 140);
    const paragraphs = (Array.isArray(story.paragraphs) ? story.paragraphs : []).map((paragraph) => copy(paragraph, 1200)).filter((paragraph): paragraph is string => Boolean(paragraph) && supported(paragraph!, prompt, known)).slice(0, 4);
    const signature = copy(story.signature, 80);
    if (heading && paragraphs.length) {
      set("story", { heading, paragraphs, ...(copy(story.eyebrow, 60) ? { eyebrow: copy(story.eyebrow, 60) } : {}), ...(signature && supported(signature, `${prompt} ${config.title}`) ? { signature } : {}) });
    }
  }

  // Practical notes (parking, children, gifts…) only when the brief mentions them.
  const notes = (Array.isArray(raw.goodToKnow) ? raw.goodToKnow : []).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const title = copy((item as RawContent).title, 80);
    const body = copy((item as RawContent).body, 500);
    return title && body && supported(`${title} ${body}`, prompt, known) ? [{ title, body }] : [];
  }).slice(0, 6);
  if (notes.length) set("goodToKnow", notes);

  if (/hotel|stay|accommodation|lodging|room block|travel|airport|flight|train|station|shuttle|parking|transport|directions/i.test(prompt)) {
    const items = (Array.isArray(raw.travel) ? raw.travel : []).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as RawContent;
      const title = copy(entry.title, 120);
      const body = copy(entry.body, 500);
      if (!title || !body || !supported(`${title} ${body}`, prompt, known)) return [];
      // Links only when the host pasted that exact https URL.
      const href = clean(entry.href, 2048);
      const linkLabel = copy(entry.linkLabel, 40);
      return [{ title, body, ...(href && /^https:\/\//i.test(href) && prompt.includes(href) ? { href, ...(linkLabel ? { linkLabel } : {}) } : {}) }];
    }).slice(0, 4);
    if (items.length) set("travel", { items });
  }
  return content;
}

/* Provider call ------------------------------------------------------------------------------------------------------ */

const nullableString = { type: ["string", "null"] } as const;
const ALL_PALETTE_KEYS = STYLE_KEYS.flatMap((key) => DESIGN_STYLES[key].palettes.map((palette) => palette.key));
// The AI may drop optional sections, never the hero, the RSVP or the when-and-where details.
const HIDEABLE = SECTION_KEYS.filter((key) => !(REQUIRED_SECTIONS as readonly string[]).includes(key) && key !== "details");

const artDirectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    styleKey: { type: "string", enum: [...STYLE_KEYS] },
    paletteKey: { type: "string", enum: ALL_PALETTE_KEYS },
    content: {
      type: "object",
      additionalProperties: false,
      properties: {
        eyebrow: nullableString,
        detailsHeading: nullableString,
        scheduleHeading: nullableString,
        story: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: { eyebrow: nullableString, heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } }, signature: nullableString },
          required: ["eyebrow", "heading", "paragraphs", "signature"],
        },
        dressCode: nullableString,
        goodToKnowHeading: nullableString,
        goodToKnow: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] } },
        travel: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, body: { type: "string" }, href: nullableString, linkLabel: nullableString }, required: ["title", "body", "href", "linkLabel"] } },
        galleryHeading: nullableString,
        rsvpHeading: nullableString,
        rsvpDescription: nullableString,
        closingLine: nullableString,
      },
      required: ["eyebrow", "detailsHeading", "scheduleHeading", "story", "dressCode", "goodToKnowHeading", "goodToKnow", "travel", "galleryHeading", "rsvpHeading", "rsvpDescription", "closingLine"],
    },
    sections: {
      type: "object",
      additionalProperties: false,
      properties: {
        hidden: { type: "array", items: { type: "string", enum: HIDEABLE } },
        variants: {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(SECTION_KEYS.map((key) => [key, { type: ["string", "null"], enum: [...SECTION_VARIANTS[key], null] }])),
          required: [...SECTION_KEYS],
        },
      },
      required: ["hidden", "variants"],
    },
  },
  required: ["styleKey", "paletteKey", "content", "sections"],
} as const;

function styleCatalog() {
  return STYLE_KEYS.map((key) => {
    const style = DESIGN_STYLES[key];
    return { styleKey: key, name: style.name, identity: style.identity, bestFor: style.bestFor, palettes: style.palettes.map((palette) => ({ paletteKey: palette.key, name: palette.name })) };
  });
}

const SYSTEM = [
  "You are Eventloom's art director. Choose one approved style and one of that style's palettes for an event website, and write its short page copy.",
  "You never output colors, fonts, sizes or layout; the style system owns all of that.",
  "Facts are sacred: never invent names, dates, times, venues, addresses, dress codes, policies (children, plus-ones, gifts, phones), hotels, travel, links or a couple's story. Use only facts stated in the brief.",
  "Leave a field null (or an array empty) when the brief gives nothing real for it; a section without content is simply left off the page. Do not repeat the title, date or venue in headings.",
  "Write warm, specific, concise copy in the brief's language: eyebrow ≤ 6 words, headings ≤ 6 words, rsvpDescription one sentence, closingLine one short sentence.",
  "story only when the brief tells a story (how a couple met, why the host is gathering people); paragraphs retell it in 1–3 short paragraphs.",
  "If the host picked a mood, honor it: choose a style that suits both the event and the mood; the palette for that mood is fixed afterwards.",
  "Variants: null keeps the style's default layout; only change one when it clearly serves this event. Hide a section only if the brief asks for that.",
].join(" ");

export type ArtDirection = { design: EventDesign; generated: boolean };

/**
 * Picks the style, palette, sections and copy for a new event. Always resolves: on a missing key, an exhausted
 * time budget, a provider error or invalid output it falls back to the deterministic mapping.
 */
export async function artDirectEvent(input: { prompt: string; config: EventConfig; mood?: string | null; hasPhotos?: boolean; deadline?: number }): Promise<ArtDirection> {
  const fallback = fallbackEventDesign({ config: input.config, prompt: input.prompt, mood: input.mood });
  const key = env.openaiApiKey();
  const budget = aiCallTimeoutMs(input.deadline);
  if (!key || budget === null) return { design: fallback, generated: false };
  const mood = detectMood(input.prompt, input.mood, input.config.theme.mood);
  const suggestion = chooseDesignStyle({ eventType: input.config.eventType, prompt: input.prompt, mood });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // A short, closed-set choice plus a few lines of copy: low effort (the default) keeps the build fast.
      ...openaiResponsesOptions("art-director"),
      input: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            brief: input.prompt,
            eventType: input.config.eventType,
            hostMood: mood,
            hasPhotos: Boolean(input.hasPhotos),
            suggestedStyle: suggestion.styleKey,
            knownFacts: { title: input.config.title, subtitle: input.config.subtitle, date: input.config.date, venueName: input.config.venueName, venueAddress: input.config.venueAddress ?? null, rsvpDeadline: input.config.rsvpDeadline ?? null, schedule: input.config.schedule.map((item) => item.title) },
            styles: styleCatalog(),
          }),
        },
      ],
      text: { format: { type: "json_schema", name: "eventloom_art_direction", strict: true, schema: artDirectionSchema } },
    }),
    // The art director runs after the planner; it never needs the whole remaining budget.
    signal: AbortSignal.timeout(Math.min(budget, 60_000)),
  }).catch(() => null);
  if (!response?.ok) return { design: fallback, generated: false };
  const data = await response.json().catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  const output = data?.output_text ?? data?.output?.flatMap((item) => item.content ?? []).map((content) => content.text).filter(Boolean).join("\n");
  if (!output) return { design: fallback, generated: false };
  try {
    const design = designFromArtDirection(JSON.parse(output) as RawContent, { prompt: input.prompt, config: input.config, mood, kind: suggestion.kind });
    return design ? { design, generated: true } : { design: fallback, generated: false };
  } catch {
    return { design: fallback, generated: false };
  }
}

/** Validates and grounds a model response into a stored design; null when it cannot be used. */
export function designFromArtDirection(raw: RawContent, context: { prompt: string; config: EventConfig; mood: DesignMood | null; kind: DesignKind }): EventDesign | null {
  let styleKey = typeof raw.styleKey === "string" && (STYLE_KEYS as readonly string[]).includes(raw.styleKey) ? raw.styleKey as StyleKey : null;
  if (!styleKey) return null;
  // Guard rails the model may not cross: a memorial is never playful, a kids' party is never black-tie.
  if ((context.kind === "memorial" && styleKey === "playful") || (context.kind === "kids" && styleKey === "noir")) styleKey = STYLE_FOR_KIND[context.kind][context.mood ?? "default"];
  const style = DESIGN_STYLES[styleKey];
  const rawPalette = typeof raw.paletteKey === "string" ? raw.paletteKey : "";
  const paletteKey = context.mood ? MOOD_PALETTE[styleKey][context.mood] : style.palettes.some((palette) => palette.key === rawPalette) ? rawPalette : paletteFor(styleKey, null, context.prompt);

  const sections = raw.sections && typeof raw.sections === "object" ? raw.sections as RawContent : {};
  const hidden = (Array.isArray(sections.hidden) ? sections.hidden : []).filter((key): key is SectionKey => typeof key === "string" && HIDEABLE.includes(key as SectionKey));
  const rawVariants = sections.variants && typeof sections.variants === "object" ? sections.variants as RawContent : {};
  const hasHeroPhoto = Boolean(context.config.heroImageUrl && /^(?:https:\/\/|\/)/i.test(context.config.heroImageUrl));
  const variants = Object.fromEntries(SECTION_KEYS.flatMap((key) => {
    const value = rawVariants[key];
    if (typeof value !== "string" || !(SECTION_VARIANTS[key] as readonly string[]).includes(value)) return [];
    // An uploaded photo always leads the page: keep a photo hero when there is a photo.
    if (key === "hero" && hasHeroPhoto && value !== "cover" && value !== "split") return [];
    return [[key, value]];
  }));
  const overrides = { ...(hidden.length ? { hidden: [...new Set(hidden)] } : {}), ...(Object.keys(variants).length ? { variants } : {}) };
  const content = groundDesignContent(raw.content && typeof raw.content === "object" ? raw.content as RawContent : {}, context.prompt, context.config);
  const parsed = eventDesignSchema.safeParse({ version: EVENT_DESIGN_VERSION, styleKey, paletteKey, content, ...(Object.keys(overrides).length ? { sections: overrides } : {}) });
  return parsed.success ? parsed.data : null;
}
