import { z } from "zod";
import { DESIGN_STYLES, STYLE_KEYS, TONES, type StyleKey } from "@/lib/event-design/styles";
import type { EventDesignContent } from "@/lib/event-design/types";
import type { EventConfig } from "@/lib/types";

/** Every section kind a designed site can have, in the default page order. */
export const SECTION_KEYS = ["hero", "details", "story", "schedule", "gallery", "goodToKnow", "travel", "rsvp", "closing"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** The closed set of layouts per section. The AI and the studio may only pick from these. */
export const SECTION_VARIANTS = {
  hero: ["cover", "split", "typeset", "monogram", "poster"],
  details: ["columns", "card", "ticket"],
  story: ["letter", "centered"],
  schedule: ["timeline", "agenda"],
  gallery: ["masonry", "grid"],
  goodToKnow: ["cards"],
  travel: ["list"],
  rsvp: ["split", "centered"],
  closing: ["signoff", "marquee"],
} as const satisfies Record<SectionKey, readonly string[]>;

/** Sections a host can never hide: the page needs a title and a way to reply. */
export const REQUIRED_SECTIONS = ["hero", "rsvp"] as const satisfies readonly SectionKey[];

export const EVENT_DESIGN_VERSION = 1;

const text = (max: number) => z.string().trim().min(1).max(max);
const safeHref = z.string().trim().max(2048).refine((value) => /^https:\/\//i.test(value), "https_only");

export const eventDesignContentSchema = z.object({
  eyebrow: text(80).optional(),
  detailsHeading: text(80).optional(),
  scheduleHeading: text(80).optional(),
  story: z.object({
    eyebrow: text(60).optional(),
    heading: text(140),
    paragraphs: z.array(text(1200)).min(1).max(4),
    signature: text(80).optional(),
  }).strict().optional(),
  dressCode: z.object({ title: text(60).optional(), body: text(300) }).strict().optional(),
  goodToKnowHeading: text(80).optional(),
  goodToKnow: z.array(z.object({ title: text(80), body: text(500) }).strict()).max(6).optional(),
  travel: z.object({
    heading: text(80).optional(),
    items: z.array(z.object({ title: text(120), body: text(500), href: safeHref.optional(), linkLabel: text(40).optional() }).strict()).min(1).max(4),
  }).strict().optional(),
  galleryHeading: text(80).optional(),
  rsvpHeading: text(80).optional(),
  rsvpDescription: text(300).optional(),
  closingLine: text(160).optional(),
}).strict();

const sectionKeySchema = z.enum(SECTION_KEYS);

export const eventDesignSectionsSchema = z.object({
  order: z.array(sectionKeySchema).max(SECTION_KEYS.length).optional(),
  hidden: z.array(sectionKeySchema).max(SECTION_KEYS.length).optional(),
  variants: z.object({
    hero: z.enum(SECTION_VARIANTS.hero).optional(),
    details: z.enum(SECTION_VARIANTS.details).optional(),
    story: z.enum(SECTION_VARIANTS.story).optional(),
    schedule: z.enum(SECTION_VARIANTS.schedule).optional(),
    gallery: z.enum(SECTION_VARIANTS.gallery).optional(),
    goodToKnow: z.enum(SECTION_VARIANTS.goodToKnow).optional(),
    travel: z.enum(SECTION_VARIANTS.travel).optional(),
    rsvp: z.enum(SECTION_VARIANTS.rsvp).optional(),
    closing: z.enum(SECTION_VARIANTS.closing).optional(),
  }).strict().optional(),
  /** Per-section tone overrides; sections without one follow the style's rhythm. */
  tones: z.partialRecord(sectionKeySchema, z.enum(TONES)).optional(),
}).strict();

/**
 * The design of a new-style event site, stored on EventConfig.design (event_versions.config is jsonb, so
 * every version carries its own design). The AI and the studio only ever pick keys from closed sets;
 * colors, fonts and layout come from the style definitions.
 */
export const eventDesignSchema = z.object({
  version: z.literal(EVENT_DESIGN_VERSION),
  styleKey: z.enum(STYLE_KEYS),
  paletteKey: z.string().min(1).max(40),
  content: eventDesignContentSchema,
  sections: eventDesignSectionsSchema.optional(),
}).strict().superRefine((design, ctx) => {
  if (!DESIGN_STYLES[design.styleKey].palettes.some((palette) => palette.key === design.paletteKey)) {
    ctx.addIssue({ code: "custom", path: ["paletteKey"], message: "palette_not_in_style" });
  }
  for (const key of design.sections?.hidden ?? []) {
    if ((REQUIRED_SECTIONS as readonly string[]).includes(key)) ctx.addIssue({ code: "custom", path: ["sections", "hidden"], message: `cannot_hide_${key}` });
  }
  const order = design.sections?.order ?? [];
  if (new Set(order).size !== order.length) ctx.addIssue({ code: "custom", path: ["sections", "order"], message: "duplicate_section" });
});

export type EventDesign = z.infer<typeof eventDesignSchema>;
export type EventDesignSections = NonNullable<EventDesign["sections"]>;

// Keep the stored content shape and the renderer's content type in step.
type Assert<T extends true> = T;
export type ContentMatchesRenderer = Assert<z.infer<typeof eventDesignContentSchema> extends EventDesignContent ? true : false>;

/** The validated design of an event, or null for an event that still renders through the legacy site document. */
export function readEventDesign(config: Pick<EventConfig, "design"> | null | undefined): EventDesign | null {
  if (!config?.design) return null;
  const parsed = eventDesignSchema.safeParse(config.design);
  return parsed.success ? parsed.data : null;
}

export function isStyleVariant<K extends SectionKey>(kind: K, value: unknown): value is (typeof SECTION_VARIANTS)[K][number] {
  return typeof value === "string" && (SECTION_VARIANTS[kind] as readonly string[]).includes(value);
}

export function paletteKeysFor(styleKey: StyleKey) {
  return DESIGN_STYLES[styleKey].palettes.map((palette) => palette.key);
}
