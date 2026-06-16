import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EventsList } from "@/components/events-list";
import { FadeIn } from "@/components/ui/fade-in";
import { listActiveGenerationJobs } from "@/lib/agent/tools";
import { demoEvents } from "@/lib/sample-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { EventRecord } from "@/lib/types";

async function loadEvents(): Promise<EventRecord[]> {
  if (!isSupabaseConfigured()) {
    return demoEvents;
  }

  const client = await createSupabaseServerClient();
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
  const user = await getServerUser();
  const [events, activeJobs] = await Promise.all([
    loadEvents(),
    user ? listActiveGenerationJobs(user.id) : Promise.resolve([]),
  ]);

  return (
    <AppShell
      title="My events"
      description="Create, preview, and manage your event pages in one place."
      action={
        <Link
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#0071e3] px-5 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.98]"
          href="/app/events/new"
        >
          New event
        </Link>
      }
    >
      {events.length === 0 ? (
        <FadeIn>
          <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white px-8 py-16 text-center">
            <p className="text-[21px] font-semibold tracking-tight">No events yet</p>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-[#6e6e73]">
              Describe your first celebration and Eventloom will draft a page for you.
            </p>
            <Link
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white transition-all hover:bg-[#0077ed]"
              href="/app/events/new"
            >
              Create your first site
            </Link>
          </div>
        </FadeIn>
      ) : (
        <EventsList events={events} activeJobs={activeJobs} />
      )}
    </AppShell>
  );
}
