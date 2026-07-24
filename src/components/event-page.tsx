import type { EventRecord } from "@/lib/types";
import { RsvpForm } from "@/components/rsvp-form";
import { SiteDocumentRenderer } from "@/components/site-document-renderer";
import { env, publicRsvpEnabled } from "@/lib/env";
import { createPublicRsvpToken } from "@/lib/security/rsvp-token";
import { appUrl } from "@/lib/env";
import { createReferralSourceToken } from "@/lib/referrals/token";

export function EventPage({ event }: { event: EventRecord }) {
  const formToken = createPublicRsvpToken(event.id, event.slug) ?? "";
  const referralToken = createReferralSourceToken(event.id);
  const referralHref = referralToken
    ? new URL(`/referral/${encodeURIComponent(referralToken)}`, appUrl()).toString()
    : new URL("/#create", appUrl()).toString();
  const rsvpEnabled = publicRsvpEnabled() && Boolean(formToken) && event.status === "published" && event.rsvp_open;
  if (event.document) {
    return <SiteDocumentRenderer document={event.document} config={event.config} status={event.status} rsvpOpen={rsvpEnabled} formToken={formToken} turnstileSiteKey={env.turnstileSiteKey()} referralHref={referralHref} />;
  }
  const { config } = event;
  const colors = config.theme.colors.length >= 4 ? config.theme.colors : ["#191713", "#f7f4ee", "#b48a5a", "#405448"];

  return (
    <main className="eventloom-site-shell min-h-screen" style={{ background: colors[1], color: colors[0] }}>
      <FallbackSite event={event} />
      <section className="eventloom-managed-rsvp px-5 pb-12 sm:px-8" aria-label="Guest reply">
        <div className="mx-auto max-w-2xl">
          <RsvpForm className="eventloom-managed-rsvp__form" formToken={formToken} turnstileSiteKey={env.turnstileSiteKey()} referralHref={referralHref} isOpen={rsvpEnabled} fields={event.config.rsvpFields} />
        </div>
      </section>
    </main>
  );
}

function FallbackSite({ event }: { event: EventRecord }) {
  const { config } = event;
  return <section className="mx-auto max-w-5xl px-6 py-20"><div className="text-center"><p className="text-sm uppercase tracking-[0.2em] opacity-60">{config.eventType}</p><h1 className="mt-4 text-6xl font-semibold">{config.title}</h1><p className="mx-auto mt-5 max-w-2xl text-xl opacity-75">{config.subtitle}</p><div className="mt-8 flex flex-wrap justify-center gap-5"><p>{config.date}</p><p>{config.venueName}</p></div></div><section className="mt-20"><h2 className="text-3xl font-semibold">Schedule</h2><div className="mt-5 grid gap-4">{config.schedule.map((item) => <article key={`${item.time}-${item.title}`} className="border-t border-current/15 py-5"><p className="text-sm opacity-60">{item.time}</p><h3 className="mt-1 text-xl font-semibold">{item.title}</h3>{item.location ? <p className="mt-1 opacity-70">{item.location}</p> : null}{item.description ? <p className="mt-2 opacity-70">{item.description}</p> : null}</article>)}</div></section></section>;
}
