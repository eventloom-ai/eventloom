import type { ComponentData, Data } from "@puckeditor/core";
import { designEventSite } from "@/lib/event-design/design-event-site";
import { EVENT_DESIGN_VERSION, SECTION_KEYS, eventDesignSchema, isStyleVariant, type EventDesign, type EventDesignSections, type SectionKey } from "@/lib/event-design/schema";
import { DESIGN_STYLES, TONES, isStyleKey, pickPalette, type Tone } from "@/lib/event-design/styles";
import type { EventDesignContent } from "@/lib/event-design/types";
import { puckDataToEventPatch } from "@/lib/puck-document";
import type { EventConfig } from "@/lib/types";

/**
 * Studio mapping for designed events: one Puck component per section kind, root fields for the style, palette and
 * event details. Puck data ↔ EventConfig.design is lossless for everything the studio can edit (see puck-design tests).
 */

export const DESIGN_COMPONENT_FOR_SECTION = {
  hero: "Hero",
  details: "Details",
  story: "Story",
  schedule: "Schedule",
  gallery: "Gallery",
  goodToKnow: "GoodToKnow",
  travel: "Travel",
  rsvp: "Rsvp",
  closing: "Closing",
} as const satisfies Record<SectionKey, string>;

export type DesignComponentName = (typeof DESIGN_COMPONENT_FOR_SECTION)[SectionKey];

const SECTION_FOR_COMPONENT = Object.fromEntries(Object.entries(DESIGN_COMPONENT_FOR_SECTION).map(([kind, name]) => [name, kind])) as Record<string, SectionKey>;

export const sectionPuckId = (kind: SectionKey) => `section-${kind}`;

/** The section a Puck component id points at ("section-story" → "story"), for AI requests about a selected section. */
export function sectionKindFromPuckId(id: string | null | undefined): SectionKey | null {
  const kind = id?.startsWith("section-") ? id.slice("section-".length) : "";
  return (SECTION_KEYS as readonly string[]).includes(kind) ? kind as SectionKey : null;
}

type Props = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" ? value : "");
/** Empty text means "use the style's default copy". */
const opt = (value: unknown, max: number) => {
  const text = str(value).trim();
  return text ? text.slice(0, max) : undefined;
};

function contentProps(kind: SectionKey, content: EventDesignContent): Props {
  switch (kind) {
    case "hero": return { eyebrow: content.eyebrow ?? "" };
    case "details": return { heading: content.detailsHeading ?? "", dressCode: content.dressCode?.body ?? "" };
    case "schedule": return { heading: content.scheduleHeading ?? "" };
    case "story": return { eyebrow: content.story?.eyebrow ?? "", heading: content.story?.heading ?? "", paragraphs: content.story?.paragraphs.join("\n\n") ?? "", signature: content.story?.signature ?? "" };
    case "gallery": return { heading: content.galleryHeading ?? "" };
    case "goodToKnow": return { heading: content.goodToKnowHeading ?? "", items: (content.goodToKnow ?? []).map((item) => ({ ...item })) };
    case "travel": return { heading: content.travel?.heading ?? "", items: (content.travel?.items ?? []).map((item) => ({ title: item.title, body: item.body, href: item.href ?? "", linkLabel: item.linkLabel ?? "" })) };
    case "rsvp": return { heading: content.rsvpHeading ?? "", description: content.rsvpDescription ?? "" };
    case "closing": return { line: content.closingLine ?? "" };
  }
}

/** Writes one section's props back into the content, leaving every other section's copy untouched. */
function applyContentProps(kind: SectionKey, props: Props, content: EventDesignContent): EventDesignContent {
  const next: EventDesignContent = { ...content };
  const assign = <K extends keyof EventDesignContent>(key: K, value: EventDesignContent[K] | undefined) => {
    if (value === undefined) delete next[key];
    else next[key] = value;
  };
  if (kind === "hero") assign("eyebrow", opt(props.eyebrow, 80));
  if (kind === "details") {
    assign("detailsHeading", opt(props.heading, 80));
    const dress = opt(props.dressCode, 300);
    assign("dressCode", dress ? { ...(content.dressCode?.title ? { title: content.dressCode.title } : {}), body: dress } : undefined);
  }
  if (kind === "schedule") assign("scheduleHeading", opt(props.heading, 80));
  if (kind === "story") {
    const heading = opt(props.heading, 140);
    const paragraphs = str(props.paragraphs).split(/\n\s*\n/).map((paragraph) => paragraph.trim().slice(0, 1200)).filter(Boolean).slice(0, 4);
    const eyebrow = opt(props.eyebrow, 60);
    const signature = opt(props.signature, 80);
    assign("story", heading && paragraphs.length ? { heading, paragraphs, ...(eyebrow ? { eyebrow } : {}), ...(signature ? { signature } : {}) } : undefined);
  }
  if (kind === "gallery") assign("galleryHeading", opt(props.heading, 80));
  if (kind === "goodToKnow") {
    assign("goodToKnowHeading", opt(props.heading, 80));
    const items = (Array.isArray(props.items) ? props.items as Props[] : []).flatMap((item) => {
      const title = opt(item?.title, 80);
      const body = opt(item?.body, 500);
      return title && body ? [{ title, body }] : [];
    }).slice(0, 6);
    assign("goodToKnow", items.length ? items : undefined);
  }
  if (kind === "travel") {
    const items = (Array.isArray(props.items) ? props.items as Props[] : []).flatMap((item) => {
      const title = opt(item?.title, 120);
      const body = opt(item?.body, 500);
      if (!title || !body) return [];
      const href = opt(item?.href, 2048);
      const linkLabel = opt(item?.linkLabel, 40);
      // Links must be https; anything else is dropped rather than rejected so typing never breaks autosave.
      return [{ title, body, ...(href && /^https:\/\//i.test(href) ? { href, ...(linkLabel ? { linkLabel } : {}) } : {}) }];
    }).slice(0, 4);
    const heading = opt(props.heading, 80);
    assign("travel", items.length ? { ...(heading ? { heading } : {}), items } : undefined);
  }
  if (kind === "rsvp") {
    assign("rsvpHeading", opt(props.heading, 80));
    assign("rsvpDescription", opt(props.description, 300));
  }
  if (kind === "closing") assign("closingLine", opt(props.line, 160));
  return next;
}

function renderedKinds(config: EventConfig, design: Pick<EventDesign, "styleKey" | "paletteKey" | "content" | "sections">) {
  return designEventSite(config, design.styleKey, design.content, { paletteKey: design.paletteKey, sections: design.sections }).sections.map((section) => section.kind);
}

/** Root props for the event details, the same fields the legacy studio edits (see puck-document.ts). */
export function eventRootProps(config: EventConfig): Props {
  return {
    eventTitle: config.title,
    eventSubtitle: config.subtitle,
    eventDate: config.date,
    venueName: config.venueName,
    venueAddress: config.venueAddress ?? "",
    rsvpDeadline: config.rsvpDeadline ?? "",
    schedule: config.schedule.map((item) => ({ title: item.title, time: item.time, location: item.location ?? "", description: item.description ?? "" })),
  };
}

/** A designed event as Puck data: one component per rendered section, in page order. */
export function designToPuckData(config: EventConfig, design: EventDesign): Data {
  const content: ComponentData[] = renderedKinds(config, design).map((kind) => ({
    type: DESIGN_COMPONENT_FOR_SECTION[kind],
    props: {
      id: sectionPuckId(kind),
      // "" means "the style's default"; an explicit value is the host's override.
      variant: design.sections?.variants?.[kind] ?? "",
      tone: design.sections?.tones?.[kind] ?? "",
      ...contentProps(kind, design.content),
    },
  }));
  return { root: { props: { styleKey: design.styleKey, paletteKey: design.paletteKey, ...eventRootProps(config) } }, content } as unknown as Data;
}

function rootProps(data: Data) {
  return ((data.root as { props?: Props }).props ?? data.root) as Props;
}

/** The event-details patch from the root fields (title, date, venue, schedule…), validated like the legacy studio's. */
export function puckDesignDataToEventPatch(data: Data) {
  return puckDataToEventPatch(data);
}

/**
 * Puck data → the design to store. `base` is the current design: copy of sections that are not on the canvas is kept,
 * a section removed from the canvas is hidden (and shown again when re-added), and a style change resets the
 * per-section variant and tone overrides (they belong to the old style) and maps the palette to the new style.
 */
export function puckDataToDesign(data: Data, base: EventDesign, config: EventConfig): EventDesign {
  const root = rootProps(data);
  const styleKey = typeof root.styleKey === "string" && isStyleKey(root.styleKey) ? root.styleKey : base.styleKey;
  const style = DESIGN_STYLES[styleKey];
  const styleChanged = styleKey !== base.styleKey;
  const requestedPalette = str(root.paletteKey);
  const paletteKey = style.palettes.some((palette) => palette.key === requestedPalette)
    ? requestedPalette
    : pickPalette(style, `${requestedPalette} ${base.paletteKey} ${config.theme.mood}`).key;

  const seen = new Set<SectionKey>();
  const onCanvas: { kind: SectionKey; props: Props }[] = [];
  for (const component of data.content) {
    const kind = SECTION_FOR_COMPONENT[component.type];
    if (!kind || seen.has(kind)) continue;
    seen.add(kind);
    onCanvas.push({ kind, props: component.props as Props });
  }

  let content = base.content;
  for (const { kind, props } of onCanvas) content = applyContentProps(kind, props, content);

  const variants: Partial<Record<SectionKey, string>> = styleChanged ? {} : { ...(base.sections?.variants ?? {}) };
  const tones: Partial<Record<SectionKey, Tone>> = styleChanged ? {} : { ...(base.sections?.tones ?? {}) };
  if (!styleChanged) {
    for (const { kind, props } of onCanvas) {
      if (isStyleVariant(kind, props.variant)) variants[kind] = props.variant;
      else delete variants[kind];
      if (typeof props.tone === "string" && (TONES as readonly string[]).includes(props.tone)) tones[kind] = props.tone as Tone;
      else delete tones[kind];
    }
  }

  // Hidden: sections that were on the page and are no longer on the canvas, plus sections already hidden and still absent.
  const wasRendered = new Set(renderedKinds(config, base));
  const hidden = SECTION_KEYS.filter((kind) => kind !== "hero" && kind !== "rsvp" && !seen.has(kind) && (wasRendered.has(kind) || base.sections?.hidden?.includes(kind)));

  const sectionsWithoutOrder: EventDesignSections = {
    ...(hidden.length ? { hidden } : {}),
    ...(Object.keys(variants).length ? { variants: variants as EventDesignSections["variants"] } : {}),
    ...(Object.keys(tones).length ? { tones } : {}),
  };
  const candidate = { styleKey, paletteKey, content };
  // Keep the stored order when the canvas still matches it; otherwise store the canvas order.
  const canvasOrder = onCanvas.map((item) => item.kind);
  const withBaseOrder = { ...sectionsWithoutOrder, ...(base.sections?.order ? { order: base.sections.order } : {}) };
  const renderedWithBase = renderedKinds(config, { ...candidate, sections: withBaseOrder });
  const canvasRendered = canvasOrder.filter((kind) => renderedWithBase.includes(kind));
  const sameOrder = canvasRendered.length === renderedWithBase.length && canvasRendered.every((kind, index) => kind === renderedWithBase[index]);
  const sections: EventDesignSections = sameOrder ? withBaseOrder : { ...sectionsWithoutOrder, order: canvasOrder.filter((kind) => kind !== "hero") };

  return eventDesignSchema.parse({
    version: EVENT_DESIGN_VERSION,
    ...candidate,
    ...(Object.keys(sections).length ? { sections } : {}),
  });
}
