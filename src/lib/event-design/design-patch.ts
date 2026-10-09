import { z } from "zod";
import { EVENT_DESIGN_VERSION, REQUIRED_SECTIONS, SECTION_KEYS, eventDesignContentSchema, eventDesignSchema, isStyleVariant, type EventDesign, type EventDesignSections, type SectionKey } from "@/lib/event-design/schema";
import { DESIGN_STYLES, STYLE_KEYS, pickPalette, type StyleKey } from "@/lib/event-design/styles";
import type { EventDesignContent } from "@/lib/event-design/types";

/**
 * A structured edit over an event's design, produced by the studio assistant: switch style or palette, rewrite
 * or clear copy, and show, hide, reorder or re-layout sections. Applying it always yields a valid design.
 */
export const CONTENT_KEYS = ["eyebrow", "detailsHeading", "scheduleHeading", "story", "dressCode", "goodToKnowHeading", "goodToKnow", "travel", "galleryHeading", "rsvpHeading", "rsvpDescription", "closingLine"] as const satisfies readonly (keyof EventDesignContent)[];
export type ContentKey = (typeof CONTENT_KEYS)[number];

const sectionKey = z.enum(SECTION_KEYS);

export const designPatchSchema = z.object({
  styleKey: z.enum(STYLE_KEYS).optional(),
  paletteKey: z.string().max(40).optional(),
  /** Copy to set; omitted keys are unchanged. */
  content: eventDesignContentSchema.partial().optional(),
  /** Copy to remove (back to the style's default heading, or the section disappears when it has no content). */
  clearContent: z.array(z.enum(CONTENT_KEYS)).max(CONTENT_KEYS.length).optional(),
  hide: z.array(sectionKey).max(SECTION_KEYS.length).optional(),
  show: z.array(sectionKey).max(SECTION_KEYS.length).optional(),
  order: z.array(sectionKey).max(SECTION_KEYS.length).optional(),
  /** null resets a section to the style's default layout. */
  variants: z.partialRecord(sectionKey, z.string().nullable()).optional(),
}).strict();

export type DesignPatch = z.infer<typeof designPatchSchema>;

export function isEmptyDesignPatch(patch: DesignPatch) {
  return !patch.styleKey && !patch.paletteKey && !Object.keys(patch.content ?? {}).length && !patch.clearContent?.length && !patch.hide?.length && !patch.show?.length && !patch.order?.length && !Object.keys(patch.variants ?? {}).length;
}

/** Sections whose rendering a patch touches, for highlighting in the studio. */
export function sectionsTouchedBy(patch: DesignPatch): SectionKey[] {
  const contentSection: Record<ContentKey, SectionKey> = {
    eyebrow: "hero", detailsHeading: "details", scheduleHeading: "schedule", story: "story", dressCode: "details", goodToKnowHeading: "goodToKnow",
    goodToKnow: "goodToKnow", travel: "travel", galleryHeading: "gallery", rsvpHeading: "rsvp", rsvpDescription: "rsvp", closingLine: "closing",
  };
  const touched = new Set<SectionKey>([
    ...(Object.keys(patch.content ?? {}) as ContentKey[]).map((key) => contentSection[key]),
    ...(patch.clearContent ?? []).map((key) => contentSection[key]),
    ...(patch.hide ?? []), ...(patch.show ?? []),
    ...(Object.keys(patch.variants ?? {}) as SectionKey[]),
  ]);
  return SECTION_KEYS.filter((key) => touched.has(key));
}

export function applyDesignPatch(design: EventDesign, rawPatch: unknown): EventDesign {
  const patch = designPatchSchema.parse(rawPatch);
  const styleKey: StyleKey = patch.styleKey ?? design.styleKey;
  const style = DESIGN_STYLES[styleKey];
  const styleChanged = styleKey !== design.styleKey;
  const paletteKey = patch.paletteKey && style.palettes.some((palette) => palette.key === patch.paletteKey)
    ? patch.paletteKey
    : styleChanged ? pickPalette(style, `${patch.paletteKey ?? ""} ${design.paletteKey}`).key : design.paletteKey;

  const content: EventDesignContent = { ...design.content };
  for (const key of patch.clearContent ?? []) delete content[key];
  Object.assign(content, patch.content ?? {});

  const current = design.sections ?? {};
  const hidden = new Set<SectionKey>(current.hidden ?? []);
  for (const key of patch.hide ?? []) if (!(REQUIRED_SECTIONS as readonly string[]).includes(key)) hidden.add(key);
  for (const key of patch.show ?? []) hidden.delete(key);

  // Layout overrides belong to a style; a new style starts from its own defaults.
  const variants: Partial<Record<SectionKey, string>> = styleChanged ? {} : { ...(current.variants ?? {}) };
  for (const [key, value] of Object.entries(patch.variants ?? {}) as [SectionKey, string | null][]) {
    if (value === null) delete variants[key];
    else if (isStyleVariant(key, value)) variants[key] = value;
  }
  const tones = styleChanged ? undefined : current.tones;
  const order = patch.order?.length ? [...new Set(patch.order.filter((key) => key !== "hero"))] : current.order;

  const sections: EventDesignSections = {
    ...(order?.length ? { order } : {}),
    ...(hidden.size ? { hidden: SECTION_KEYS.filter((key) => hidden.has(key)) } : {}),
    ...(Object.keys(variants).length ? { variants: variants as EventDesignSections["variants"] } : {}),
    ...(tones && Object.keys(tones).length ? { tones } : {}),
  };
  return eventDesignSchema.parse({ version: EVENT_DESIGN_VERSION, styleKey, paletteKey, content, ...(Object.keys(sections).length ? { sections } : {}) });
}

/* Deterministic edits for when the assistant's provider is unavailable ---------------------------------------------- */

const STYLE_WORDS: Array<[RegExp, StyleKey]> = [
  [/\b(?:luxe|noir|black[- ]?tie|glam(?:orous)?|art deco|dark (?:and|&) (?:gold|elegant))\b/i, "noir"],
  [/\b(?:editorial|magazine|newspaper|newsprint)\b/i, "editorial"],
  [/\b(?:romantic|letterpress|delicate|botanical)\b/i, "romantic"],
  [/\b(?:minimal|minimalist|modern|swiss)\b/i, "minimal"],
  [/\b(?:playful|colou?rful|poster)\b/i, "playful"],
];

const SECTION_WORDS: Array<[RegExp, SectionKey]> = [
  [/\bstory\b/i, "story"], [/\bschedule|timeline|agenda\b/i, "schedule"], [/\bgallery|photos\b/i, "gallery"],
  [/\bgood to know|faqs?|notes\b/i, "goodToKnow"], [/\btravel|hotels?|stay\b/i, "travel"], [/\bclosing|footer|sign-?off\b/i, "closing"], [/\bdetails|when (?:and|&) where\b/i, "details"],
];

const MOOD_HINTS = /\b(blush|pink|rose|sage|green|forest|emerald|navy|blue|cobalt|gold|black|orange|sunset|teal|mint|lagoon|lavender|purple|yellow|red|vermilion)\b/i;

/** A best-effort reading of a plain request: style and palette words, and "hide/show the X". */
export function fallbackDesignPatch(prompt: string, design: EventDesign): { patch: DesignPatch; message: string; summary: string } {
  const patch: DesignPatch = {};
  const style = STYLE_WORDS.find(([pattern]) => pattern.test(prompt))?.[1];
  if (style && style !== design.styleKey) patch.styleKey = style;
  const target = DESIGN_STYLES[patch.styleKey ?? design.styleKey];
  const color = prompt.match(MOOD_HINTS)?.[1];
  if (color) {
    const palette = target.palettes.find((item) => item.hints.test(color));
    if (palette && (palette.key !== design.paletteKey || patch.styleKey)) patch.paletteKey = palette.key;
  }
  const verb = prompt.match(/\b(hide|remove|drop|delete|show|add|bring back)\b/i)?.[1]?.toLowerCase();
  if (verb) {
    const sections = SECTION_WORDS.filter(([pattern]) => pattern.test(prompt)).map(([, key]) => key).filter((key) => !(REQUIRED_SECTIONS as readonly string[]).includes(key));
    if (sections.length) {
      if (["show", "add", "bring back"].includes(verb)) patch.show = sections;
      else patch.hide = sections;
    }
  }
  if (isEmptyDesignPatch(patch)) {
    return { patch, summary: "No design change", message: "I couldn’t tell what to change. Try “switch to the Playful style”, “use the sage palette” or “hide the travel section”, or edit any text directly on the page." };
  }
  const parts = [
    patch.styleKey ? `switched to the ${DESIGN_STYLES[patch.styleKey].name} style` : null,
    patch.paletteKey ? `used the ${target.palettes.find((item) => item.key === patch.paletteKey)?.name ?? patch.paletteKey} palette` : null,
    patch.hide?.length ? `hid ${patch.hide.join(", ")}` : null,
    patch.show?.length ? `showed ${patch.show.join(", ")}` : null,
  ].filter(Boolean);
  const sentence = parts.join(" and ");
  return { patch, summary: sentence.charAt(0).toUpperCase() + sentence.slice(1), message: `I ${sentence}.` };
}
