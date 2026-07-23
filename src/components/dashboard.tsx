import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventsList } from "@/components/events-list";
import { FadeIn } from "@/components/ui/fade-in";
import { listActiveGenerationJobs } from "@/lib/agent/tools";
import { demoEvents } from "@/lib/sample-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { EventRecord } from "@/lib/types";

async function loadEvents(filter: "all" | "published", userId: string | null): Promise<EventRecord[]> {
  if (!isSupabaseConfigured()) {
    return filter === "published" ? demoEvents.filter((event) => event.status === "published") : demoEvents;
  }
  if (!userId) {
    return [];
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return [];
  }

  let query = client
    .from("events")
    .select("id, owner_id, slug, status, rsvp_open, config")
    .eq("owner_id", userId);
  if (filter === "published") {
    query = query.eq("status", "published");
  }
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as EventRecord[];
}

export async function Dashboard({ filter = "all" }: { filter?: "all" | "published" }) {
  const user = await getServerUser();
  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(filter === "published" ? "/app?status=published" : "/app")}`);
  }
  const [events, activeJobs] = await Promise.all([
    loadEvents(filter, user?.id ?? null),
    user ? listActiveGenerationJobs(user.id) : Promise.resolve([]),
  ]);
  const publishedOnly = filter === "published";

  return (
    <AppShell
      title={publishedOnly ? "Published sites" : "My events"}
      description={publishedOnly ? "The live event sites you own and have published." : "Create, preview, and manage your event pages in one place."}
      action={
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-black/10 px-5 py-2.5 text-[15px] font-medium transition-colors hover:bg-white"
            href={publishedOnly ? "/app" : "/app?status=published"}
          >
            {publishedOnly ? "All events" : "Published sites"}
          </Link>
          <Link
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#0071e3] px-5 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.98]"
            href="/app/events/new"
          >
            New event
          </Link>
        </div>
      }
    >
      {events.length === 0 ? (
        <FadeIn>
          <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white px-8 py-16 text-center">
            <p className="text-[21px] font-semibold tracking-tight">{publishedOnly ? "No published sites yet" : "No events yet"}</p>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-[#6e6e73]">
              {publishedOnly ? "Publish an event when it is ready and it will appear here." : "Describe your first celebration and Eventloom will draft a page for you."}
            </p>
            <Link
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white transition-all hover:bg-[#0077ed]"
              href={publishedOnly ? "/app" : "/app/events/new"}
            >
              {publishedOnly ? "View all events" : "Create your first site"}
            </Link>
          </div>
        </FadeIn>
      ) : (
        <EventsList events={events} activeJobs={activeJobs} currentUserId={user?.id ?? null} />
      )}
    </AppShell>
  );
}
