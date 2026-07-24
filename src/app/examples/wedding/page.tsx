import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock3, LockKeyhole, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Wedding Site Example · Eventloom",
  description: "A sanitized Eventloom example adapted from RSVP OS, using the men's English invitation artwork with RSVP disabled.",
};

const schedule = [
  { title: "Reception", time: "6:00 PM", description: "Welcome, refreshments, and family greetings." },
  { title: "Zaffa & Dabka", time: "6:45 PM", description: "A traditional procession and celebration." },
  { title: "Couple Entrance", time: "7:15 PM", description: "The couple makes their entrance with family." },
  { title: "Dinner", time: "8:00 PM", description: "Dinner and an evening of celebration." },
];

export default function WeddingExamplePage() {
  return (
    <main className="relative isolate overflow-hidden bg-[#f7f2ed] text-[#1f1a17]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(217,163,160,0.28),transparent_30rem),radial-gradient(circle_at_86%_18%,rgba(116,125,92,0.18),transparent_25rem),linear-gradient(135deg,#fbf7f1_0%,#f3e7dd_48%,#efe7d8_100%)]" />

      <header className="px-5 pt-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f3032]">
            <span className="grid size-7 place-items-center rounded-full bg-[#6f3032] text-white"><Sparkles className="size-3.5" /></span>
            Eventloom
          </Link>
          <span className="rounded-full border border-white/70 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6f3032] shadow-sm backdrop-blur-xl">
            Example site
          </span>
        </div>
      </header>

      <section className="px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pb-28">
        <div className="mx-auto flex max-w-6xl flex-col items-center">
          <div className="relative w-full max-w-[760px]">
            <div className="absolute -inset-5 rounded-[2.2rem] bg-white/45 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/75 bg-white/50 p-3 shadow-[0_30px_90px_rgba(65,42,36,0.18)] backdrop-blur-xl sm:p-4">
              <Image
                src="/examples/men-english.png"
                alt="Men’s English wedding invitation"
                width={1055}
                height={1491}
                priority
                sizes="(max-width: 768px) 92vw, 760px"
                className="h-auto w-full rounded-[1.45rem]"
              />
            </div>
          </div>
          <p className="mt-8 max-w-xl text-center text-sm leading-7 text-[#5f5955]">
            This example is adapted from RSVP OS. Venue details and guest submissions are intentionally omitted.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <CalendarDays className="mx-auto size-5 text-[#747d5c]" />
            <h1 className="mt-4 font-[var(--font-playfair)] text-4xl text-[#1f1a17] sm:text-5xl">Schedule of Events</h1>
            <p className="mt-3 text-sm text-[#665f5b]">A graceful timeline for every part of the celebration.</p>
          </div>
          <div className="grid gap-4">
            {schedule.map((event) => (
              <article key={event.title} className="rounded-[1.35rem] border border-white/75 bg-white/50 p-5 shadow-[0_20px_60px_rgba(65,42,36,0.10)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="font-[var(--font-playfair)] text-2xl text-[#6f3032] sm:text-3xl">{event.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#665f5b]">{event.description}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-[#6f3032]">
                    <Clock3 className="size-4" /> {event.time}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-28 pt-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/40 px-6 py-16 text-center shadow-[0_30px_90px_rgba(65,42,36,0.16)] backdrop-blur-2xl sm:px-12">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#6f3032] text-white shadow-xl"><LockKeyhole className="size-7" /></div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.28em] text-[#5f684a]">Demonstration only</p>
          <h2 className="mt-3 font-[var(--font-playfair)] text-4xl sm:text-5xl">RSVP is disabled</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#1f1a17]/65">This example shows the guest experience without collecting or transmitting any personal information.</p>
          <Link href="/studio?brief=A%20soft%20floral%20wedding%20site%20with%20a%20formal%20invitation%20and%20guest%20RSVP." className="mt-8 inline-flex rounded-full bg-[#6f3032] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(111,48,50,0.24)] transition hover:-translate-y-0.5 hover:bg-[#5f292b]">
            Create your own event
          </Link>
        </div>
      </section>
    </main>
  );
}
