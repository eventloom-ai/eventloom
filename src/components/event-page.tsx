import type { EventRecord } from "@/lib/types";
import { RsvpForm } from "@/components/rsvp-form";

export function EventPage({ event }: { event: EventRecord }) {
  const { config } = event;
  const colors = config.theme.colors.length >= 4 ? config.theme.colors : ["#191713", "#f7f4ee", "#b48a5a", "#405448"];

  return (
    <main style={{ background: colors[1], color: colors[0] }} className="min-h-screen">
      {event.artifact?.css ? <style>{event.artifact.css}</style> : null}
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1fr_420px] lg:py-16">
        <div className="space-y-14">
          <div
            className="prose-event rounded-[8px] border border-black/10 bg-white/55 p-7 shadow-[0_24px_80px_rgba(25,23,19,0.10)] backdrop-blur"
            dangerouslySetInnerHTML={{ __html: event.artifact?.html ?? fallbackHero(event) }}
          />

          {config.heroImageUrl ? (
            <figure className="overflow-hidden rounded-[8px] border border-black/10 bg-white/55 shadow-[0_24px_80px_rgba(25,23,19,0.10)]">
              <img src={config.heroImageUrl} alt="Event highlight" className="h-auto w-full object-cover" />
            </figure>
          ) : null}

          <section className="rounded-[8px] border border-black/10 bg-white/55 p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: colors[2] }}>
              Schedule
            </p>
            <div className="mt-6 grid gap-4">
              {config.schedule.map((item) => (
                <article key={`${item.title}-${item.time}`} className="rounded-[6px] bg-white p-5">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row">
                    <h2 className="text-2xl font-semibold">{item.title}</h2>
                    <p className="font-semibold" style={{ color: colors[3] }}>
                      {item.time}
                    </p>
                  </div>
                  {item.location ? <p className="mt-2 text-stone-600">{item.location}</p> : null}
                  {item.description ? <p className="mt-2 text-stone-600">{item.description}</p> : null}
                </article>
              ))}
            </div>
          </section>

          {config.galleryImageUrls?.length ? (
            <section className="rounded-[8px] border border-black/10 bg-white/55 p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: colors[2] }}>
                Gallery
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {config.galleryImageUrls.map((url, index) => (
                  <img key={url} src={url} alt={`Event gallery image ${index + 1}`} className="aspect-[4/3] w-full rounded-[6px] object-cover" />
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[8px] border border-black/10 bg-white/55 p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: colors[2] }}>
              Venue
            </p>
            <h2 className="mt-3 text-3xl font-semibold">{config.venueName}</h2>
            {config.venueAddress ? <p className="mt-2 text-stone-600">{config.venueAddress}</p> : null}
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <RsvpForm eventId={event.id} slug={event.slug} isOpen={event.status === "published" && event.rsvp_open} />
        </aside>
      </section>
    </main>
  );
}

function fallbackHero(event: EventRecord) {
  return `
    <section class="space-y-7">
      <p class="text-sm uppercase tracking-[0.28em]">${event.config.eventType}</p>
      <h1>${event.config.title}</h1>
      <p class="max-w-2xl text-xl text-stone-700">${event.config.subtitle}</p>
      <p class="text-stone-600">${event.config.date}</p>
    </section>
  `;
}
