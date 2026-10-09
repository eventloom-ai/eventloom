import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventsList } from "@/components/events-list";
import { FadeIn } from "@/components/ui/fade-in";
import { listActiveGenerationJobs } from "@/lib/agent/tools";
import { listCreatorEvents } from "@/lib/dashboard-events";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { creatorLegalStatus } from "@/lib/security/creator-legal";
import type { EventRecord } from "@/lib/types";

async function loadEvents(filter: "all" | "published", userId: string | null): Promise<EventRecord[]> {
  if (!isSupabaseConfigured() || !userId) {
    return [];
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return [];
  }

  return listCreatorEvents(client, userId, filter);
}

export async function Dashboard({ filter = "all" }: { filter?: "all" | "published" }) {
  const user = await getServerUser();
  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(filter === "published" ? "/app?status=published" : "/app")}`);
  }
  const [events, activeJobs, legalStatus] = await Promise.all([
    loadEvents(filter, user?.id ?? null),
    user ? listActiveGenerationJobs(user.id) : Promise.resolve([]),
    user && isSupabaseConfigured() ? creatorLegalStatus(user.id) : Promise.resolve(null),
  ]);
  const publishedOnly = filter === "published";

  return (
    <AppShell
      title={publishedOnly ? "Published events" : "My events"}
      description={publishedOnly ? "The live events you have published and can share with guests." : "Create, preview, and manage your events in one place."}
      action={
        <div className="flex flex-wrap gap-2">
          <Link
            className="eventloom-app-button inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-[13px] font-medium transition-colors"
            href={publishedOnly ? "/app" : "/app?status=published"}
          >
            {publishedOnly ? "All events" : "Published events"}
          </Link>
          <Link
            className="eventloom-app-button-primary inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-[13px] font-medium transition-all active:scale-[0.98]"
            href="/app/events/new"
          >
            New event
          </Link>
        </div>
      }
    >
      {legalStatus && !legalStatus.current ? <LegalUpdateNotice updated={Boolean(legalStatus.acceptedVersion)} /> : null}
      {events.length === 0 ? (
        <FadeIn>
          <div className="mx-auto max-w-md rounded-2xl bg-[#fffaf3] px-8 py-10 text-center shadow-[0_10px_40px_rgba(12,45,58,0.08)] ring-1 ring-black/[0.04]">
            <p className="text-lg font-semibold tracking-tight">{publishedOnly ? "No published events yet" : "No events yet"}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#66736c]">
              {publishedOnly ? "Publish an event when it is ready and it will appear here." : "Describe your first celebration and Eventloom will draft a page for you."}
            </p>
            <Link
              className="eventloom-app-button-primary mt-6 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
              href={publishedOnly ? "/app" : "/app/events/new"}
            >
              {publishedOnly ? "View all events" : "Create your first event"}
            </Link>
          </div>
        </FadeIn>
      ) : (
        <EventsList events={events} activeJobs={activeJobs} currentUserId={user?.id ?? null} />
      )}
    </AppShell>
  );
}

// Shown after sign-in until the creator accepts the current LEGAL_VERSION. Not a redirect: drafting stays
// available, and a missing legal_documents row can never lock anyone out of their dashboard.
function LegalUpdateNotice({ updated }: { updated: boolean }) {
  return (
    <div role="status" className="mb-6 flex flex-col gap-3 rounded-2xl bg-[#fff4dc] px-5 py-4 text-sm leading-6 text-[#5c4413] ring-1 ring-[#e8c98a] sm:flex-row sm:items-center sm:justify-between">
      <p>{updated ? "We've updated our Terms, Privacy Policy and other policies, and added a Refund Policy. Please review and accept them before you publish again." : "Please confirm you are 18 or older and accept our Terms and policies before publishing."}</p>
      <Link href="/app/legal-acceptance?next=/app" className="eventloom-app-button-primary inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-[13px] font-medium">Review and accept</Link>
    </div>
  );
}
