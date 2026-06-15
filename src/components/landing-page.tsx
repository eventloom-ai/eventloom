import Link from "next/link";
import { Globe, MessageSquare, Palette, Sparkles } from "lucide-react";
import { LandingBuilder } from "@/components/landing-builder";
import { FadeIn } from "@/components/ui/fade-in";

const features = [
  {
    icon: Palette,
    title: "A site made for your event",
    description: "Describe the occasion in plain language. Eventloom designs a unique page with your tone, schedule, and photos.",
  },
  {
    icon: MessageSquare,
    title: "Guest replies, built in",
    description: "Collect RSVPs, meal choices, and notes on a page you control — no separate forms or spreadsheets.",
  },
  {
    icon: Globe,
    title: "Your own web address",
    description: "Share a clean link or add a custom domain after checkout, so guests find you easily.",
  },
];

const steps = [
  { number: "1", title: "Describe it", description: "Tell us what you're celebrating and how the page should feel." },
  { number: "2", title: "Review & refine", description: "Preview your site, adjust details, and open guest replies when you're ready." },
  { number: "3", title: "Share", description: "Send one link. Guests reply on your page. You stay in control." },
];

export function LandingPage({ initialTemplate }: { initialTemplate?: string }) {
  return (
    <main className="min-h-screen text-[#1d1d1f]">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#fbfbfd]/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link className="text-[17px] font-semibold tracking-tight" href="/">
            Eventloom
          </Link>
          <nav className="flex items-center gap-1 text-[14px]">
            <Link className="rounded-full px-4 py-2 text-[#6e6e73] transition-colors hover:text-[#1d1d1f]" href="/demo-wedding">
              Sample site
            </Link>
            <Link
              className="rounded-full bg-[#1d1d1f] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
              href="/app"
            >
              My events
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center md:pt-28">
        <FadeIn>
          <p className="text-[15px] font-medium text-[#0071e3]">Event websites, simplified</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-[40px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[56px] md:leading-[1.05] lg:text-[64px]">
            Your event deserves
            <br />
            its own beautiful site.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[19px] leading-[1.5] text-[#6e6e73] md:text-[21px]">
            Create a custom page, collect guest replies, and share a link guests will actually remember — all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-[#0071e3] px-7 py-3.5 text-[17px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.98]"
              href="#create"
            >
              Create your site
            </a>
            <Link
              className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-black/10 bg-white px-7 py-3.5 text-[17px] font-medium transition-all hover:bg-black/[0.02] active:scale-[0.98]"
              href="/demo-wedding"
            >
              See a sample
            </Link>
          </div>
        </FadeIn>
      </section>

      <section className="border-y border-black/[0.06] bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-[32px] font-semibold tracking-[-0.02em] md:text-[40px]">Everything you need. Nothing you don&apos;t.</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73] md:text-[19px]">
                Eventloom handles the website, replies, and sharing — so you can focus on the celebration.
              </p>
            </div>
          </FadeIn>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <FadeIn key={feature.title} delay={index * 80}>
                <article className="h-full rounded-2xl border border-black/[0.06] bg-[#fbfbfd] p-8 transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.04]">
                    <feature.icon className="h-5 w-5 text-[#1d1d1f]" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-6 text-[21px] font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73]">{feature.description}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[32px] font-semibold tracking-[-0.02em] md:text-[40px]">Three steps to publish</h2>
            <p className="mt-4 text-[17px] text-[#6e6e73] md:text-[19px]">No templates to wrestle with. No code. Just your event, ready to share.</p>
          </div>
        </FadeIn>
        <ol className="mx-auto mt-14 grid max-w-4xl gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.number} className="text-center md:text-left">
              <FadeIn delay={index * 100}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1d1d1f] text-[15px] font-semibold text-white">
                  {step.number}
                </span>
                <h3 className="mt-5 text-[21px] font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">{step.description}</p>
              </FadeIn>
            </li>
          ))}
        </ol>
      </section>

      <section id="create" className="border-t border-black/[0.06] bg-white py-20 md:py-24">
        <div className="mx-auto max-w-2xl px-6">
          <FadeIn>
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5f5f7]">
                <Sparkles className="h-5 w-5 text-[#1d1d1f]" strokeWidth={1.75} />
              </div>
              <h2 className="mt-6 text-[32px] font-semibold tracking-[-0.02em] md:text-[40px]">Start with a sentence</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73] md:text-[19px]">
                Tell us about your event. Add photos if you like. We&apos;ll draft your first version right away.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={100} className="mt-10">
            <LandingBuilder initialTemplate={initialTemplate} />
          </FadeIn>
        </div>
      </section>

      <footer className="border-t border-black/[0.06] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-[13px] text-[#6e6e73] sm:flex-row">
          <p>© {new Date().getFullYear()} Eventloom</p>
          <div className="flex gap-6">
            <Link className="transition-colors hover:text-[#1d1d1f]" href="/demo-wedding">
              Sample site
            </Link>
            <Link className="transition-colors hover:text-[#1d1d1f]" href="/app">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
