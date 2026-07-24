import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronRight,
  Globe2,
  Heart,
  LockKeyhole,
  MessageSquareText,
  Palette,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { StartEventPrompt } from "@/components/start-event-prompt";

const steps = [
  {
    number: "01",
    title: "Describe your event",
    description: "Write one sentence about the celebration. Add photos now or later.",
    icon: MessageSquareText,
  },
  {
    number: "02",
    title: "Make it yours",
    description: "See a complete first draft, then ask for changes in everyday language.",
    icon: Palette,
  },
  {
    number: "03",
    title: "Share one link",
    description: "Publish when it feels right and keep every guest reply organized.",
    icon: CalendarCheck,
  },
];

const assurances = [
  "Start your draft free",
  "No design skills needed",
  "Secure guest replies",
  "Pay only when you publish",
];

const frequentlyAsked = [
  {
    question: "Do I need to know how to build a website?",
    answer: "No. Describe the event the same way you would explain it to a friend. Eventloom creates the page and you can request changes in plain language.",
  },
  {
    question: "Can I see the site before I pay?",
    answer: "Yes. You can create and edit your draft first. Payment is requested only when you are ready to publish it for guests.",
  },
  {
    question: "What do guests need to do?",
    answer: "They open your link, read the event details, and send their RSVP. Guests do not need an Eventloom account.",
  },
  {
    question: "Who can see my guest information?",
    answer: "RSVP details are available only to the event creator and authorized collaborators. Eventloom does not sell guest information or use it for advertising.",
  },
];

export function LandingPage({
  initialTemplate,
  authenticated = false,
  signupEnabled = false,
}: {
  initialTemplate?: string;
  authenticated?: boolean;
  signupEnabled?: boolean;
}) {
  return (
    <main className="overflow-hidden bg-[#fbfaf8] text-[#252329]">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#fbfaf8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-violet-600 text-white shadow-sm"><Sparkles className="size-4" /></span>
            Eventloom
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-[#66616a] md:flex">
            <Link href="#how-it-works" className="transition hover:text-[#252329]">How it works</Link>
            <Link href="#pricing" className="transition hover:text-[#252329]">Pricing</Link>
            <Link href="#questions" className="transition hover:text-[#252329]">Questions</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={authenticated ? "/app" : "/login?next=/app"}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#66616a] transition hover:bg-black/[0.04] hover:text-[#252329] sm:px-4"
            >
              {authenticated ? "My events" : "Sign in"}
            </Link>
            <Link href="#create" className="hidden rounded-full bg-[#252329] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:inline-flex">
              {authenticated ? "New event" : "Create my RSVP"}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(124,58,237,0.12),transparent_27rem),radial-gradient(circle_at_90%_10%,rgba(244,114,182,0.12),transparent_25rem)]" />
        <div className="mx-auto max-w-4xl">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/75 px-3 py-1.5 text-xs font-semibold text-violet-800 shadow-sm">
              <WandSparkles className="size-3.5" />
              Your event website, made simple
            </div>
            <h1 className="mt-6 max-w-3xl text-[clamp(2.65rem,7vw,5.65rem)] font-semibold leading-[0.96] tracking-[-0.055em]">
              A beautiful RSVP site in minutes.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#68636b] sm:text-xl">
              Tell us what you’re celebrating. Eventloom creates the website, collects guest replies, and keeps everything in one calm place.
            </p>
            <div id="create" className="mt-9 scroll-mt-28">
              <StartEventPrompt
                initialTemplate={initialTemplate}
                authenticated={authenticated}
                signupEnabled={signupEnabled}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#746f77]">
              {assurances.map((item) => <span key={item} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" />{item}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/[0.06] bg-white px-5 py-7 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 text-center text-sm text-[#625d66] sm:grid-cols-3">
          <p className="inline-flex items-center justify-center gap-2"><ShieldCheck className="size-4 text-violet-600" /> Privacy-first guest data</p>
          <p className="inline-flex items-center justify-center gap-2"><LockKeyhole className="size-4 text-violet-600" /> Secure Google or email sign-in</p>
          <p className="inline-flex items-center justify-center gap-2"><Globe2 className="size-4 text-violet-600" /> One simple link for every guest</p>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">How it works</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">From idea to guest-ready, without the learning curve.</h2>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="rounded-[1.75rem] border border-black/[0.07] bg-white p-7 shadow-[0_20px_60px_rgba(38,31,43,0.06)] sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-700"><step.icon className="size-5" /></span>
                  <span className="text-xs font-semibold tracking-[0.16em] text-[#aaa5ad]">{step.number}</span>
                </div>
                <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#6f6a72]">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#252329] px-5 py-24 text-white sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Made for normal event planning</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Ask for changes the way you naturally speak.</h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/60">No templates to wrestle with and no design tools to learn. Say “make it warmer,” “add the dinner time,” or “show the RSVP before the schedule.”</p>
            <Link href="#create" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#252329] transition hover:bg-violet-100">Start my draft <ChevronRight className="size-4" /></Link>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur sm:p-7">
            <div className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-8 place-items-center rounded-xl bg-violet-500"><Sparkles className="size-4" /></span> Eventloom helper</div>
            <div className="mt-6 rounded-2xl bg-white px-5 py-4 text-sm leading-7 text-[#38323b] shadow-xl">Make the page feel romantic and elegant. Add a dinner at 8:00 PM and ask guests about dietary restrictions.</div>
            <div className="mt-4 ml-8 rounded-2xl border border-violet-300/20 bg-violet-400/10 px-5 py-4 text-sm leading-7 text-white/75">Done. I updated the style, added dinner to the schedule, and included a dietary question in the RSVP form.</div>
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Simple pricing</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Create first. Pay when you publish.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6f6a72]">Explore your draft before making a purchase decision.</p>
          </div>
          <div className="mx-auto mt-12 max-w-xl rounded-[2rem] border border-violet-200 bg-white p-7 shadow-[0_30px_90px_rgba(79,52,115,0.13)] sm:p-9">
            <div className="flex items-start justify-between gap-6">
              <div><p className="text-lg font-semibold">One published event</p><p className="mt-1 text-sm text-[#77717a]">One year of Eventloom service</p></div>
              <div className="text-right"><p className="text-4xl font-semibold tracking-tight">$20</p><p className="mt-1 text-xs text-[#77717a]">USD</p></div>
            </div>
            <ul className="mt-8 grid gap-3 text-sm text-[#554f58]">
              {["A custom event website", "Guest RSVP collection and management", "Secure hosting and a shareable Eventloom link", "Plain-language editing help"].map((item) => <li key={item} className="flex items-start gap-3"><span className="mt-0.5 grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3" /></span>{item}</li>)}
            </ul>
            <div className="mt-7 rounded-2xl bg-[#f8f7fa] p-4 text-xs leading-6 text-[#6f6a72]">
              A custom domain is optional and charged separately at the live registrar cost shown before payment. Taxes, when applicable, are shown at checkout.
            </div>
            <Link href="#create" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500">Create my free draft <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <section id="questions" className="scroll-mt-24 border-t border-black/[0.06] bg-white px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Common questions</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">Clear answers before you start.</h2>
            <p className="mt-5 text-sm leading-7 text-[#6f6a72]">Still unsure? Use the Feedback button or visit our <Link className="font-medium text-violet-700 underline underline-offset-4" href="/contact">support page</Link>.</p>
          </div>
          <div className="grid gap-3">
            {frequentlyAsked.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-black/[0.08] bg-[#fbfaf8] px-5 py-4 open:bg-violet-50/50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
                  {item.question}
                  <ChevronRight className="size-4 shrink-0 transition group-open:rotate-90" />
                </summary>
                <p className="max-w-2xl pt-3 text-sm leading-7 text-[#6f6a72]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 py-14 text-center text-white shadow-[0_30px_100px_rgba(109,40,217,0.25)] sm:px-12 sm:py-20">
          <Heart className="mx-auto size-6" />
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Your guests only need one beautiful link.</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/75">Start with one sentence. You can change every detail before anyone sees it.</p>
          <Link href="#create" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-50">Create my RSVP site <ArrowRight className="size-4" /></Link>
        </div>
      </section>
    </main>
  );
}
