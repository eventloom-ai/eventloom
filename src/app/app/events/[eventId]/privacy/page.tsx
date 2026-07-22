import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventPrivacySettings } from "@/components/event-privacy-settings";
import { canEditEvent } from "@/lib/studio-store";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventPrivacyPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getServerUser();
  if (!user) redirect(`/login?next=/app/events/${eventId}/privacy`);
  if (!(await canEditEvent(eventId, user.id))) notFound();
  const client = serviceSupabase();
  if (!client) notFound();
  const [{ data: settings }, { data: event }] = await Promise.all([
    client.from("event_settings").select("controller_legal_name, privacy_contact, collection_purpose, optional_field_justification").eq("event_id", eventId).maybeSingle(),
    client.from("events").select("ends_at, event_ends_at, timezone, event_timezone").eq("id", eventId).maybeSingle(),
  ]);
  if (!settings || !event) notFound();
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><div className="mx-auto max-w-2xl"><Link href={`/app/events/${eventId}/studio`} className="text-sm font-semibold">← Back to studio</Link><h1 className="mt-8 text-4xl font-semibold">Privacy and event timing</h1><p className="mt-4 leading-7 text-[#6e6e73]">These details appear in the RSVP privacy context and determine the automatic deletion deadline. Publishing is blocked until they are complete.</p><EventPrivacySettings eventId={eventId} initial={{ controllerLegalName: settings.controller_legal_name ?? "", privacyContact: settings.privacy_contact ?? "", collectionPurpose: settings.collection_purpose ?? "", optionalFieldJustification: settings.optional_field_justification ?? "", endsAt: event.event_ends_at ?? event.ends_at ?? "", timezone: event.event_timezone ?? event.timezone ?? "America/Toronto" }} /></div></main>;
}
