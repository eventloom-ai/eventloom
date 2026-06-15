import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FadeIn } from "@/components/ui/fade-in";
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

function statusLabel(status: EventRecord["status"]) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

function statusStyles(status: EventRecord["status"]) {
  if (status === "published") return "bg-[#e8f5e9] text-[#1b5e20]";
  if (status === "archived") return "bg-[#f5f5f7] text-[#6e6e73]";
  return "bg-[#fff8e1] text-[#8d6e00]";
}

export async function Dashboard() {
  const events = await loadEvents();

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
        <div className="grid gap-4">
          {events.map((event, index) => (
            <FadeIn key={event.id} delay={index * 60}>
              <article className="rounded-2xl border border-black/[0.06] bg-white p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] md:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[21px] font-semibold tracking-tight">{event.config.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${statusStyles(event.status)}`}>
                        {statusLabel(event.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] text-[#6e6e73]">eventloom.ai/{event.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-[#f5f5f7]"
                      href={`/${event.slug}`}
                    >
                      Preview
                    </Link>
                    <Link
                      className="inline-flex items-center justify-center rounded-full bg-[#1d1d1f] px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                      href={`/app/events/${event.id}`}
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      )}
    </AppShell>
  );
}
