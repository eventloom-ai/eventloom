import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EventPage } from "@/components/event-page";
import { eventMetadata } from "@/lib/event-metadata";
import { resolveEventBySlug } from "@/lib/tenancy";

const loadEvent = cache(resolveEventBySlug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);
  return event && event.status !== "archived" ? eventMetadata(event, `/${event.slug}`) : { robots: { index: false } };
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event || event.status === "archived") notFound();
  return <EventPage event={event} />;
}
