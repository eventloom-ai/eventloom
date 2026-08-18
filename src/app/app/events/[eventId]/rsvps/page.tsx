import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RsvpManager } from "@/components/rsvp-manager";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { serviceSupabase } from "@/lib/supabase/server";
import type { CreatorRsvpSubmission } from "@/lib/rsvp-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function eventTitle(config: unknown) {
  if (!config || typeof config !== "object" || !("title" in config)) return "Event";
  const title = (config as { title?: unknown }).title;
  return typeof title === "string" && title.trim() ? title.trim() : "Event";
}

export default async function EventRsvpsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const auth = await getAuthContext();
  if (!auth) redirect(`/login?next=${encodeURIComponent(`/app/events/${eventId}/rsvps`)}`);

  const client = serviceSupabase();
  if (!client) notFound();

  const { data: event } = await client
    .from("events")
    .select("id, owner_id, slug, status, config")
    .eq("id", eventId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (!event) notFound();

  const title = eventTitle(event.config);
  const securityReady = auth.emailVerified && hasRequiredMfa(auth);

  if (!securityReady) {
    return (
      <AppShell
        backHref="/app"
        backLabel="My events"
        title={`${title} RSVPs`}
        description="Guest responses are protected because they can contain personal information."
      >
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8">
          <h2 className="text-xl font-semibold">Secure your account to view guest replies</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-950/75">
            Verify your email and complete two-step verification before viewing or exporting RSVP information.
          </p>
          <Link
            href="/app/profile"
            className="eventloom-app-button-primary mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Open security settings
          </Link>
        </section>
      </AppShell>
    );
  }

  const { data, error } = await client
    .from("rsvp_submissions")
    .select("id, first_name, last_name, email, phone, is_attending, party_size, status, created_at, rsvp_guests(name), rsvp_answers(field_key, value)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const submissions = error ? [] : (data ?? []) as CreatorRsvpSubmission[];

  return (
    <AppShell
      backHref="/app"
      backLabel="My events"
      title={`${title} RSVPs`}
      description="Track replies, guest totals, contact details, meal choices, and notes."
      action={
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/events/${eventId}/studio`}
            className="eventloom-app-button inline-flex rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Open studio
          </Link>
          <a
            href={`/api/events/${eventId}/rsvps/export`}
            className="eventloom-app-button-primary inline-flex rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Export CSV
          </a>
        </div>
      }
    >
      {error ? (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          Guest replies could not be loaded. Please refresh the page.
        </p>
      ) : null}
      <RsvpManager eventId={eventId} initialSubmissions={submissions} />
    </AppShell>
  );
}
