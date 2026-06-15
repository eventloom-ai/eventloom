import Link from "next/link";
import { demoEvents } from "@/lib/sample-data";
import { serviceSupabase } from "@/lib/supabase/server";
import type { EventRecord } from "@/lib/types";

async function loadEvents(): Promise<EventRecord[]> {
  const client = serviceSupabase();
  if (!client) {
    return demoEvents;
  }

  const { data } = await client
    .from("events")
    .select("id, owner_id, slug, status, rsvp_open, config")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as EventRecord[];
}

export async function Dashboard() {
  const events = await loadEvents();

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-8 text-[#191713]">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8a6a3f]">My events</p>
            <h1 className="mt-2 text-5xl font-semibold tracking-normal">Your pages</h1>
          </div>
          <Link className="rounded-full bg-[#191713] px-5 py-3 font-semibold text-white" href="/app/events/new">
            New page
          </Link>
        </header>

        <div className="mt-8 grid gap-4">
          {events.map((event) => (
            <article key={event.id} className="grid gap-4 rounded-[8px] border border-black/10 bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold">{event.config.title}</h2>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">{event.status}</span>
                </div>
                <p className="mt-2 text-stone-600">/{event.slug}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-full border border-black/15 px-4 py-2 font-semibold" href={`/${event.slug}`}>
                  View
                </Link>
                <Link className="rounded-full bg-[#405448] px-4 py-2 font-semibold text-white" href={`/app/events/${event.id}`}>
                  Edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
