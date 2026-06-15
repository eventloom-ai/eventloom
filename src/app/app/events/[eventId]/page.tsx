import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
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

function statusLabel(status: EventRecord["status"]) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

export default async function EventManagePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  if (!event) notFound();

  return (
    <AppShell backHref="/app" backLabel="My events" title={event.config.title} width="wide">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] md:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-black/[0.06] pb-6 sm:flex-row sm:items-start">
          <div>
            <p className="text-[14px] text-[#6e6e73]">eventloom.ai/{event.slug}</p>
            <p className="mt-2 text-[15px] text-[#6e6e73]">
              Status: <span className="font-medium text-[#1d1d1f]">{statusLabel(event.status)}</span>
              {event.rsvp_open ? " · Guest replies open" : " · Guest replies closed"}
            </p>
          </div>
          <Link
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-black/10 px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-[#f5f5f7]"
            href={`/${event.slug}`}
          >
            Preview page
          </Link>
        </div>

        <div className="mt-8">
          <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <form action={`/api/events/${event.id}/generate`} method="post">
              <button
                type="submit"
                className="w-full rounded-2xl border border-black/[0.06] bg-[#fbfbfd] px-5 py-5 text-left transition-colors hover:bg-[#f5f5f7]"
              >
                <p className="text-[17px] font-semibold tracking-tight">New design</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#6e6e73]">Generate a fresh version of your event page.</p>
              </button>
            </form>

            <form action={`/api/events/${event.id}/publish`} method="post">
              <input type="hidden" name="domain" value={`${event.slug}.com`} />
              <button
                type="submit"
                className="w-full rounded-2xl border border-black/[0.06] bg-[#fbfbfd] px-5 py-5 text-left transition-colors hover:bg-[#f5f5f7]"
              >
                <p className="text-[17px] font-semibold tracking-tight">Custom domain</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#6e6e73]">Get a personal website address for this event.</p>
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
