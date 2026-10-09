import type { Metadata } from "next";
import type { EventRecord } from "@/lib/types";

const PLACEHOLDER = /to be announced/i;

// Guest pages carry names, dates and venues, so they preview well when shared but stay out of search indexes.
export function eventMetadata(event: EventRecord, canonical: string): Metadata {
  const { config } = event;
  const title = config.title.trim() || "You're invited";
  const details = [config.date, config.venueName].filter((value) => value && !PLACEHOLDER.test(value)).join(" · ");
  const description = (details || config.subtitle || "You're invited. Reply online.").slice(0, 200);
  const image = config.heroImageUrl && /^(https:\/\/|\/api\/assets\/)/.test(config.heroImageUrl) ? config.heroImageUrl : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: { type: "website", title, description, url: canonical, siteName: "Eventloom", ...(image ? { images: [{ url: image, alt: title }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}
