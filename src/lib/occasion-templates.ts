import type { Metadata } from "next";
import { composeLandingBrief, eventDraftPath } from "@/lib/event-entry";
import { MOOD_PALETTES } from "@/lib/event-theme";
import { occasionTemplateContent, type OccasionMood, type OccasionTemplateContent } from "@/lib/occasion-template-content";
import { composeSiteDocument, type SiteDocument } from "@/lib/site-document";
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
  return composeLandingBrief({ description: `${occasion.brief} Use the ${mood} color palette.`, eventTypeLabel: occasion.eventTypeLabel });
}

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

/** A real site document for the sample event, composed the same way a new event's first draft is. Node ids are deterministic so static HTML is stable. */
export function sampleSite(occasion: OccasionTemplate, styleIndex = 0): { config: EventConfig; document: SiteDocument } {
  const style = occasion.styles[styleIndex] ?? occasion.styles[0];
  const config = sampleEventConfig(occasion, styleIndex);
  let counter = 0;
  const document = composeSiteDocument(config, style.prompt, (prefix) => `${prefix}_${(counter++).toString(36)}`);
  return { config, document };
}

/** The opening and the section after it, sized to its content: enough to read as the top of the page in a thumbnail. */
export function sampleThumbnailDocument(document: SiteDocument): SiteDocument {
  return {
    ...document,
    nodes: document.nodes.slice(0, 2).map((node, index) => index === 0 ? { ...node, style: { ...node.style, minHeight: "auto" as const } } : node),
  };
}

const ogImage = { url: "/opengraph-image", width: 1200, height: 630, alt: "Eventloom event websites with online RSVPs" };

function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title: `${title} | Eventloom`, description, url: path, siteName: "Eventloom", images: [ogImage] },
    twitter: { card: "summary_large_image", title: `${title} | Eventloom`, description, images: [ogImage.url] },
  };
}

export function occasionMetadata(occasion: OccasionTemplate): Metadata {
  return pageMetadata(occasion.title, occasion.metaDescription, occasionPath(occasion.slug));
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
