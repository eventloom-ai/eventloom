import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventEditor } from "@/components/event-editor";
import { ensureDefaultOrganizationForUser } from "@/lib/organizations";
import { demoEvents } from "@/lib/sample-data";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import type { EventRecord } from "@/lib/types";

async function loadEvent(eventId: string): Promise<EventRecord | null> {
  const client = serviceSupabase();
  if (!client) {
    return demoEvents.find((event) => event.id === eventId) ?? demoEvents[0] ?? null;
  }

  const user = await getServerUser();
  if (!user) return null;

  const organization = await ensureDefaultOrganizationForUser(user);
  if (!organization) return null;

  const { data } = await client
    .from("events")
    .select("id, owner_id, organization_id, slug, status, rsvp_open, config")
    .eq("id", eventId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  return (data as EventRecord | null) ?? null;
}

export default async function EventManagePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  if (!event) notFound();

  return (
    <AppShell backHref="/app" backLabel="My events" title={event.config.title} width="full">
      <EventEditor event={event} />
    </AppShell>
  );
}
