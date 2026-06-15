import { notFound } from "next/navigation";
import { EventPage } from "@/components/event-page";
import { resolveEventBySlug } from "@/lib/tenancy";

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await resolveEventBySlug(slug);
  if (!event || event.status === "archived") notFound();
  return <EventPage event={event} />;
}
