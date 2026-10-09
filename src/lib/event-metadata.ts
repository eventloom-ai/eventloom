import type { Metadata } from "next";
import type { EventRecord } from "@/lib/types";

const PLACEHOLDER = /to be announced/i;

/**
 * Guest pages carry names, dates and venues, so they preview well when shared but stay out of search indexes.
 * The share image is the route's opengraph-image file (a card drawn in the event's design, or the generic Eventloom
 * card for drafts); file-based images take priority, and the large Twitter card reuses it as its image.
 */
export function eventMetadata(event: EventRecord, canonical: string): Metadata {
  const { config } = event;
  const title = config.title.trim() || "You're invited";
  const details = [config.date, config.venueName].filter((value) => value && !PLACEHOLDER.test(value)).join(" · ");
  const description = (details || config.subtitle || "You're invited. Reply online.").slice(0, 200);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: { type: "website", title, description, url: canonical, siteName: "Eventloom" },
    twitter: { card: "summary_large_image", title, description },
  };
}
