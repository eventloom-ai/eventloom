import { readEventDesign } from "@/lib/event-design/schema";
import type { SiteDocument, SiteNode } from "@/lib/site-document";
import type { EventConfig } from "@/lib/types";

export type GuestFacingContent = { texts: string[]; links: string[] };

/**
 * Every piece of host- or AI-written text and every outbound link a guest can see on the page, for the publish-time
 * moderation and phishing checks. Covers the event facts, the design copy (story, good to know, schedule, travel…)
 * and the legacy site document, whichever the page renders.
 */
export function guestFacingContent(config: Partial<EventConfig> | null | undefined, document?: SiteDocument | null): GuestFacingContent {
  const texts: string[] = [];
  const links: string[] = [];
  const add = (...values: Array<string | null | undefined>) => {
    for (const value of values) if (typeof value === "string" && value.trim()) texts.push(value.trim());
  };

  if (config) {
    add(config.title, config.subtitle, config.eventType, config.date, config.venueName, config.venueAddress, config.hallInfo, config.directionsLabel, config.rsvpDeadline);
    for (const item of Array.isArray(config.schedule) ? config.schedule : []) add(item?.title, item?.time, item?.location, item?.description);
    for (const alt of Object.values(config.imageAlts ?? {})) add(alt);

    const content = readEventDesign(config)?.content;
    if (content) {
      add(content.eyebrow, content.detailsHeading, content.scheduleHeading, content.goodToKnowHeading, content.galleryHeading, content.rsvpHeading, content.rsvpDescription, content.closingLine);
      if (content.story) add(content.story.eyebrow, content.story.heading, ...content.story.paragraphs, content.story.signature);
      if (content.dressCode) add(content.dressCode.title, content.dressCode.body);
      for (const item of content.goodToKnow ?? []) add(item.title, item.body);
      if (content.travel) {
        add(content.travel.heading);
        for (const item of content.travel.items) {
          add(item.title, item.body, item.linkLabel);
          if (item.href) links.push(item.href);
        }
      }
    }
  }

  const visit = (nodes: SiteNode[]) => {
    for (const node of nodes) {
      if (node.type === "text") add(node.content);
      else if (node.type === "button") {
        add(node.label);
        links.push(node.href);
      } else if (node.type === "image") add(node.alt);
      else if (node.type === "gallery") add(...node.images.map((image) => image.alt));
      else if (node.type === "rsvp") add(node.heading, node.description);
      if ("children" in node) visit(node.children);
    }
  };
  if (document?.nodes) visit(document.nodes);

  return { texts: [...new Set(texts)], links: [...new Set(links)] };
}
