import type { EventRecord } from "@/lib/types";
import { RsvpForm } from "@/components/rsvp-form";
import { SiteDocumentRenderer } from "@/components/site-document-renderer";

export function EventPage({ event }: { event: EventRecord }) {
  if (event.document) {
    return <SiteDocumentRenderer document={event.document} config={event.config} eventId={event.id} slug={event.slug} status={event.status} rsvpOpen={event.rsvp_open} />;
  }
  const { config } = event;
  const colors = config.theme.colors.length >= 4 ? config.theme.colors : ["#191713", "#f7f4ee", "#b48a5a", "#405448"];

  return (
    <main className="eventloom-site-shell min-h-screen" style={{ background: colors[1], color: colors[0] }}>
      {event.artifact?.css ? <style>{event.artifact.css}</style> : null}
      <div
        className="eventloom-generated-page"
        dangerouslySetInnerHTML={{ __html: event.artifact?.html ?? fallbackSite(event) }}
      />
      <section className="eventloom-managed-rsvp px-5 pb-12 sm:px-8" aria-label="Guest reply">
        <div className="mx-auto max-w-2xl">
          <RsvpForm className="eventloom-managed-rsvp__form" eventId={event.id} slug={event.slug} isOpen={event.status === "published" && event.rsvp_open} fields={event.config.rsvpFields} />
        </div>
      </section>
    </main>
  );
}

function fallbackSite(event: EventRecord) {
  const { config } = event;
  return `<section class="eventloom-fallback"><div class="eventloom-fallback__hero"><p class="eventloom-fallback__eyebrow">${escapeHtml(config.eventType)}</p><h1>${escapeHtml(config.title)}</h1><p class="eventloom-fallback__intro">${escapeHtml(config.subtitle)}</p><div class="eventloom-fallback__details"><p>${escapeHtml(config.date)}</p><p>${escapeHtml(config.venueName)}</p></div></div><section class="eventloom-fallback__schedule"><h2>Schedule</h2>${config.schedule.map((item) => `<article><p>${escapeHtml(item.time)}</p><h3>${escapeHtml(item.title)}</h3>${item.location ? `<span>${escapeHtml(item.location)}</span>` : ""}${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</article>`).join("")}</section></section>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
