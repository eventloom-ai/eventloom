import type { Metadata } from "next";
import { composeLandingBrief, eventDraftPath, paletteSentence } from "@/lib/event-entry";
import { MOOD_PALETTE, STYLE_FOR_KIND, chooseDesignStyle } from "@/lib/event-design/style-choice";
import { designEventSite } from "@/lib/event-design/design-event-site";
import { DESIGN_STYLES, type StyleKey } from "@/lib/event-design/styles";
import type { DesignedSection, EventSiteDesign } from "@/lib/event-design/types";
import { MOOD_PALETTES } from "@/lib/event-theme";
import { ogCardFromDesign } from "@/lib/og/event-og-card";
import { occasionTemplateContent, type OccasionMood, type OccasionTemplateContent } from "@/lib/occasion-template-content";
import type { EventConfig } from "@/lib/types";

export type OccasionTemplate = OccasionTemplateContent;
export type { OccasionMood };

export const occasionTemplates: readonly OccasionTemplate[] = occasionTemplateContent;

export const TEMPLATES_PATH = "/templates";

export const templatesIndexCopy = {
  title: "Event Website Templates with RSVP",
  metaDescription: "Event website templates for weddings, birthdays, showers, reunions, and more. Each one is a real sample page with an RSVP you can start from in a minute.",
} as const;

export function occasionPath(slug: string) {
  return `${TEMPLATES_PATH}/${slug}`;
}

export function getOccasionTemplate(slug: string) {
  return occasionTemplates.find((occasion) => occasion.slug === slug) ?? null;
}

/** The brief a "Use this template" link starts a build with. A style adds its palette word, which the build maps to that palette. */
export function occasionTemplateBrief(occasion: OccasionTemplate, mood: OccasionMood = occasion.styles[0].mood) {
  return composeLandingBrief({ description: `${occasion.brief} ${paletteSentence(mood)}`, eventTypeLabel: occasion.eventTypeLabel });
}

/** The draft path a template starts. Pages link through TemplateStartLink, which sends signed-out visitors to sign up first. */
export function occasionTemplateHref(occasion: OccasionTemplate, mood?: OccasionMood) {
  return eventDraftPath(occasionTemplateBrief(occasion, mood));
}

export function sampleEventConfig(occasion: OccasionTemplate, styleIndex = 0): EventConfig {
  const style = occasion.styles[styleIndex] ?? occasion.styles[0];
  return {
    title: occasion.sample.title,
    subtitle: occasion.sample.subtitle,
    eventType: occasion.name,
    date: occasion.sample.date,
    venueName: occasion.sample.venueName,
    venueAddress: occasion.sample.venueAddress,
    schedule: occasion.schedule.map((item) => ({ ...item })),
    rsvpFields: [...occasion.sample.rsvpFields],
    theme: { mood: style.mood, colors: [...MOOD_PALETTES[style.mood]], fontPairing: style.name },
    template: "custom",
  };
}

// Words in a template style's prompt that name a design style, strongest first.
const STYLE_CUES: Array<[RegExp, StyleKey]> = [
  [/black-tie|luxury|gold details/i, "noir"],
  [/sharp|modern|corporate|professional|tech/i, "minimal"],
  [/playful|loud|bold|graphic|festival/i, "playful"],
  [/editorial|literary|vintage/i, "editorial"],
  [/romantic|soft|intimate|paper|tea party/i, "romantic"],
];

type StyleChoice = { styleKey: StyleKey; paletteKey: string };

/** Best first: the style the template's wording names, then the kind-and-mood default, each in its mood palette, then its other palette. */
function sampleStyleCandidates(occasion: OccasionTemplate, styleIndex: number): StyleChoice[] {
  const style = occasion.styles[styleIndex] ?? occasion.styles[0];
  const chosen = chooseDesignStyle({ eventType: occasion.name, prompt: style.prompt, mood: style.mood });
  const cued = STYLE_CUES.find(([pattern]) => pattern.test(style.prompt))?.[1];
  // A memorial is never playful and never gets the vermilion accent.
  const allowed = (choice: StyleChoice) => chosen.kind !== "memorial" || (choice.styleKey !== "playful" && choice.paletteKey !== "newsprint");
  return [cued ?? chosen.styleKey, chosen.styleKey, STYLE_FOR_KIND[chosen.kind].default]
    .flatMap((styleKey) => {
      const preferred = MOOD_PALETTE[styleKey][style.mood];
      return [preferred, ...DESIGN_STYLES[styleKey].palettes.map((palette) => palette.key).filter((key) => key !== preferred)].map((paletteKey) => ({ styleKey, paletteKey }));
    })
    .filter(allowed);
}

/** The approved design style and palette each template style is shown in. Styles on one page never look identical. */
export function sampleDesignStyle(occasion: OccasionTemplate, styleIndex = 0): StyleChoice {
  const earlier = occasion.styles.slice(0, styleIndex).map((_, index) => sampleDesignStyle(occasion, index));
  const candidates = sampleStyleCandidates(occasion, styleIndex);
  return candidates.find((choice) => !earlier.some((item) => item.styleKey === choice.styleKey && item.paletteKey === choice.paletteKey)) ?? candidates[0];
}

/** The sample event as a designed site, laid out by the same designEventSite a new event uses. Deterministic, so static HTML is stable. */
export function sampleDesignedSite(occasion: OccasionTemplate, styleIndex = 0): EventSiteDesign {
  const config = sampleEventConfig(occasion, styleIndex);
  const { styleKey, paletteKey } = sampleDesignStyle(occasion, styleIndex);
  return designEventSite(config, styleKey, {}, { paletteKey });
}

/** Share card for a template page: its first sample, labelled as a template. */
export function occasionOgCard(occasion: OccasionTemplate) {
  return ogCardFromDesign(sampleDesignedSite(occasion), { eyebrow: `${occasion.name} template` });
}

/**
 * The opening and the section after it: enough to read as the top of the page in a thumbnail. Thumbnails sit inside
 * gallery links, so their RSVP button and directions link carry no target and render as plain text.
 */
export function sampleThumbnailSite(design: EventSiteDesign): EventSiteDesign {
  const sections = design.sections.slice(0, 2).map((section): DesignedSection => {
    if (section.kind === "hero") return { ...section, props: { ...section.props, cta: { ...section.props.cta, href: "" } } };
    if (section.kind === "details") return { ...section, props: { ...section.props, mapUrl: undefined } };
    return section;
  });
  return { ...design, sections };
}

const ogImage = { url: "/opengraph-image", width: 1200, height: 630, alt: "Eventloom event websites with online RSVPs" };

/** `ownImage`: the route has its own opengraph-image file, which takes priority and which the Twitter card reuses. */
function pageMetadata(title: string, description: string, path: string, ownImage = false): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title: `${title} | Eventloom`, description, url: path, siteName: "Eventloom", ...(ownImage ? {} : { images: [ogImage] }) },
    twitter: { card: "summary_large_image", title: `${title} | Eventloom`, description, ...(ownImage ? {} : { images: [ogImage.url] }) },
  };
}

export function occasionMetadata(occasion: OccasionTemplate): Metadata {
  return pageMetadata(occasion.title, occasion.metaDescription, occasionPath(occasion.slug), true);
}

export function templatesIndexMetadata(): Metadata {
  return pageMetadata(templatesIndexCopy.title, templatesIndexCopy.metaDescription, TEMPLATES_PATH);
}

/** Words of guide copy on an occasion page (excluding the sample event itself). */
export function occasionWordCount(occasion: OccasionTemplate) {
  const text = [
    occasion.intro,
    ...occasion.include.flatMap((item) => [item.title, item.body]),
    ...occasion.schedule.flatMap((item) => [item.title, item.description ?? ""]),
    occasion.scheduleNote,
    ...occasion.rsvpQuestions.flatMap((item) => [item.question, item.why]),
    ...occasion.wording.flatMap((item) => [item.tip, item.example ?? ""]),
    ...occasion.faqs.flatMap((item) => [item.question, item.answer]),
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}
