import { notFound } from "next/navigation";
import { EventPage } from "@/components/event-page";
import { resolveEventByHost } from "@/lib/tenancy";

export default async function HostEventPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const event = await resolveEventByHost(decodeURIComponent(host));
  if (!event || event.status === "archived") notFound();
  return <EventPage event={event} />;
}
