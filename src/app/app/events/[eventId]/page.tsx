import Link from "next/link";
import { notFound } from "next/navigation";
import { demoEvents } from "@/lib/sample-data";
import { serviceSupabase } from "@/lib/supabase/server";
import type { EventRecord } from "@/lib/types";

async function loadEvent(eventId: string): Promise<EventRecord | null> {
  const client = serviceSupabase();
  if (!client) {
    return demoEvents.find((event) => event.id === eventId) ?? demoEvents[0] ?? null;
  }

  const { data } = await client
    .from("events")
    .select("id, owner_id, slug, status, rsvp_open, config")
    .eq("id", eventId)
    .maybeSingle();

  return (data as EventRecord | null) ?? null;
}

export default async function EventManagePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  if (!event) notFound();

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-8 text-[#191713]">
      <section className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-stone-600" href="/app">
          Back to dashboard
        </Link>
        <div className="mt-6 grid gap-4 rounded-[8px] border border-black/10 bg-white p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-5xl font-semibold">{event.config.title}</h1>
              <p className="mt-3 text-stone-600">/{event.slug}</p>
            </div>
            <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
              {event.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <form action={`/api/events/${event.id}/generate`} method="post">
              <button className="w-full rounded-full bg-[#405448] px-4 py-3 font-semibold text-white">Generate artifact</button>
            </form>
            <form action={`/api/events/${event.id}/publish`} method="post">
              <input type="hidden" name="domain" value={`${event.slug}.com`} />
              <button className="w-full rounded-full bg-[#191713] px-4 py-3 font-semibold text-white">Start publish</button>
            </form>
            <Link className="rounded-full border border-black/15 px-4 py-3 text-center font-semibold" href={`/${event.slug}`}>
              Preview page
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
