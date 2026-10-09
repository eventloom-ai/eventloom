import { notFound, redirect } from "next/navigation";
import { EventSite } from "@/components/event-sections/event-site";
import { PrivatePreviewToolbar } from "@/components/private-preview-toolbar";
import { RsvpForm } from "@/components/rsvp-form";
import { SiteDocumentRenderer } from "@/components/site-document-renderer";
import { designSiteFromConfig } from "@/lib/event-design/design-event-site";
import { isSupabaseConfigured } from "@/lib/env";
import { canEditEvent, loadStudioState } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";

export default async function PrivateEventPreview({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ version?: string }> }) {
  const { eventId } = await params;
  const { version } = await searchParams;
  const user = await getServerUser();
  if (isSupabaseConfigured() && !user) redirect(`/login?next=${encodeURIComponent(`/app/events/${eventId}/preview`)}`);
  if (!(await canEditEvent(eventId, user?.id ?? null))) notFound();
  const state = await loadStudioState(eventId, user?.id ?? null);
  if (!state) notFound();
  const revision = version ? state.versions.find((item) => item.id === version) ?? state.revision : state.revision;
  // Same rendering rule as the public page: a designed version renders through EventSite, any other through its site document.
  const designed = designSiteFromConfig(revision.config);
  return (
    <>
      <PrivatePreviewToolbar eventId={state.event.id} status={state.event.status} />
      {designed ? (
        <main data-eventloom-guest-page="">
          <EventSite design={designed} rsvp={<RsvpForm hideHeader formToken="" turnstileSiteKey="" isOpen={false} isDraft={state.event.status === "draft"} fields={revision.config.rsvpFields} />} />
        </main>
      ) : (
        <SiteDocumentRenderer document={revision.document} config={revision.config} eventId={state.event.id} slug={state.event.slug} status={state.event.status} rsvpOpen={state.event.rsvp_open} />
      )}
    </>
  );
}
