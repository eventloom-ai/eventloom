import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPage } from "@/components/event-page";
import { eventMetadata } from "@/lib/event-metadata";
import { loadEventByHost } from "@/lib/public-event";
import { normalizeHost } from "@/lib/tenancy";

export async function generateMetadata({ params }: { params: Promise<{ host: string }> }): Promise<Metadata> {
  const host = normalizeHost(decodeURIComponent((await params).host));
  const event = await loadEventByHost(host);
  return event && event.status !== "archived" ? eventMetadata(event, `https://${host}/`) : { robots: { index: false } };
}

export default async function HostEventPage({ params }: { params: Promise<{ host: string }> }) {
  const host = normalizeHost(decodeURIComponent((await params).host));
  const event = await loadEventByHost(host);
  if (!event || event.status === "archived") notFound();
  return <EventPage event={event} />;
}
