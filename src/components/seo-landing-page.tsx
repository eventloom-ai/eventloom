import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { StartEventPrompt } from "@/components/start-event-prompt";
import { publicSignupEnabled } from "@/lib/env";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { getServerUser } from "@/lib/supabase/server";
import type { SeoLandingPage } from "@/lib/seo-landing-pages";

export async function SeoLandingPage({ page }: { page: SeoLandingPage }) {
  const user = await getServerUser();
  const authenticated = Boolean(user);
  const authConfigured = hasSupabasePublicEnv();
  const signupEnabled = publicSignupEnabled();

  return (
    <main className="overflow-hidden bg-[#e7ecdf] text-[#302821]">
      <header className="border-b border-[#302821]/10 bg-[#302821] text-white">
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-[15px] font-semibold text-white" aria-label="Eventloom home">Eventloom</Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 text-[13px] text-white/70 md:flex">
            <Link href="/event-website-builder" className="transition hover:text-white">Event websites</Link>
            <Link href="/rsvp-website" className="transition hover:text-white">RSVP websites</Link>
            <Link href="/contact" className="transition hover:text-white">Contact</Link>
          </nav>
          <Link href="/#create" className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#302821] transition hover:bg-[#fffaf3]">Create an event</Link>
        </div>
      </header>

      <section className="bg-[#302821] px-5 py-20 text-[#fff9f2] sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">{page.eyebrow}</p>
            <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-playfair)] text-5xl leading-[0.94] tracking-[-0.055em] sm:text-7xl">{page.heading}</h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#eadbd0]/75">{page.intro}</p>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#eadbd0]/70">
              <span>Start privately</span><span>Publish when ready</span><span>Guest data stays private</span>
            </div>
          </div>
          <div className="rounded-[1.75rem] bg-[#fffaf3] p-3 text-[#302821] shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:p-5">
            <div className="rounded-[1.25rem] border border-[#302821]/10 bg-[#f3e7d9] p-5 sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6153]">Start your draft</p>
              <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-3xl leading-none tracking-[-0.045em]">Describe the event you are planning.</h2>
              <p className="mt-3 text-sm leading-6 text-[#74675d]">Eventloom will help turn the idea into a website and RSVP experience.</p>
              <div className="mt-6">
                <StartEventPrompt initialEventType={page.eventType} authenticated={authenticated} authConfigured={authConfigured} signupEnabled={signupEnabled} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Why Eventloom</p>
            <h2 className="mt-5 max-w-sm font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">{page.primaryBenefit}</h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {page.benefits.map((benefit) => (
              <li key={benefit} className="rounded-2xl border border-[#302821]/10 bg-[#fffaf3] p-5 text-sm leading-7 text-[#5f5248] shadow-[0_10px_30px_rgba(65,43,28,0.05)]">
                <Check className="size-5 text-[#8a6153]" aria-hidden="true" />
                <span className="mt-4 block">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-[#302821]/10 bg-[#fffaf3] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">More than an RSVP form</p>
            <h2 className="mt-5 max-w-xl font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">Give guests the context they need before they reply.</h2>
            <div className="mt-7 grid gap-5 text-sm leading-7 text-[#6d6055] sm:grid-cols-2">
              <p>A form collects an answer. Eventloom gives guests a welcoming event website with the story, schedule, location, and questions in one place.</p>
              <p>A static invitation looks nice but often creates follow-up work. Eventloom keeps the page and the guest responses connected as plans change.</p>
            </div>
          </div>
          <article className="rounded-[1.5rem] bg-[#302821] p-6 text-[#fff9f2] sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#dfb89f]">Simple pricing</p>
            <div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-lg font-semibold">One published event</p><p className="mt-1 text-sm text-[#eadbd0]/65">One year of Eventloom service</p></div><p className="font-[family-name:var(--font-playfair)] text-5xl tracking-[-0.055em]">$20</p></div>
            <ul className="mt-7 space-y-2 border-t border-white/15 pt-5 text-sm leading-6 text-[#eadbd0]/75"><li>Custom event website and shareable link</li><li>Guest RSVP collection and response management</li><li>Plain-language editing and secure hosting</li></ul>
            <p className="mt-5 text-xs leading-6 text-[#eadbd0]/55">Create and refine your draft first. A custom domain is optional and charged separately at the live registrar cost shown before payment.</p>
          </article>
        </div>
      </section>

      <section className="bg-[#eff2e9] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">How it works</p>
          <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">From your first idea to a link worth sharing.</h2>
          <ol className="mt-12 grid gap-0 border-y border-[#302821]/15 lg:grid-cols-3">
            {page.steps.map((step, index) => (
              <li key={step.title} className="border-b border-[#302821]/15 py-8 last:border-b-0 lg:border-b-0 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8a6153]">0{index + 1}</p>
                <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em]">{step.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-7 text-[#6d6055]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Questions, answered</p>
            <h2 className="mt-5 max-w-sm font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">A few things to know before you begin.</h2>
          </div>
          <div className="border-t border-[#302821]/15">
            {page.faqs.map((faq) => (
              <details key={faq.question} className="group border-b border-[#302821]/15 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold marker:content-none">{faq.question}<span aria-hidden="true" className="text-xl font-normal text-[#a37561] transition group-open:rotate-45">+</span></summary>
                <p className="max-w-2xl pt-4 text-sm leading-7 text-[#6d6055]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#302821] px-5 py-20 text-center text-[#fff9f2] sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">Ready when you are</p>
          <h2 className="mt-5 font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-6xl">Start with the event you already have in mind.</h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#eadbd0]/70">Create and refine your draft before you decide to publish it.</p>
          <Link href="/#create" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#fffaf3] px-6 py-3.5 text-sm font-semibold text-[#302821] transition hover:bg-white">Create your event <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="border-t border-[#302821]/10 px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#6d6055]">
          <span className="font-semibold text-[#302821]">Explore more:</span>
          {page.related.map((related) => <Link key={related.href} href={related.href} className="underline decoration-[#c19a7d] underline-offset-4 transition hover:text-[#8a6153]">{related.label}</Link>)}
        </div>
      </section>
    </main>
  );
}
