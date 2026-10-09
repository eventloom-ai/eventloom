import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPage } from "@/components/event-page";
import { eventMetadata } from "@/lib/event-metadata";
import { loadEventBySlug } from "@/lib/public-event";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEventBySlug(slug);
  return event && event.status !== "archived" ? eventMetadata(event, `/${event.slug}`) : { robots: { index: false } };
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await loadEventBySlug(slug);
  if (!event || event.status === "archived") notFound();
  return <EventPage event={event} />;
}
