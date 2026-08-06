import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  LockKeyhole,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { EventloomLogo } from "@/components/logo";
import { StartEventPrompt } from "@/components/start-event-prompt";

const navItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Questions", href: "#questions" },
  { label: "Contact", href: "/contact" },
];

const trustHighlights = [
  {
    title: "No payment to start",
    description: "Create and refine your draft first. Pay only when you publish.",
    icon: CalendarCheck,
  },
  {
    title: "Private guest information",
    description: "RSVP details are visible only to your event team.",
    icon: LockKeyhole,
  },
  {
    title: "Secure sign-in",
    description: "Use trusted account sign-in and keep full ownership of your event.",
    icon: ShieldCheck,
  },
];

const featureCards = [
  {
    title: "Creative",
    description: "Turn one sentence into a polished website and keep refining the tone, layout, and details.",
    icon: Palette,
  },
  {
    title: "Simple",
    description: "No templates to learn. Just describe what you want and make edits in plain language.",
    icon: ArrowRight,
  },
  {
    title: "Trustworthy",
    description: "Clear pricing, private guest data, and a calm setup flow before sharing your link.",
    icon: ShieldCheck,
  },
];

export function LandingPage({
  initialTemplate,
  authenticated = false,
  authConfigured = true,
  signupEnabled = false,
}: {
  initialTemplate?: string;
  authenticated?: boolean;
  authConfigured?: boolean;
  signupEnabled?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#f5f7f2] text-[#16161a]">
      <header className="sticky top-0 z-50 border-b border-emerald-700/30 bg-[#f7f9f3]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-base font-semibold text-[#252329]">
            <EventloomLogo />
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm text-[#585260] md:flex">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-[#16161a]">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={authenticated || !authConfigured ? "/app" : "/login?next=/app"}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#4f4a54] transition hover:bg-black/[0.04] hover:text-[#252329] sm:px-4"
            >
              {authenticated ? "My events" : authConfigured ? "Sign in" : "Open local demo"}
            </Link>
            <Link
              href="#create"
              className="hidden rounded-full bg-[#101111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:inline-flex"
            >
              {authenticated ? "New event" : "Get started free"}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-emerald-700/20 px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(63,112,75,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,112,75,0.09)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="pointer-events-none absolute inset-x-0 top-20 -z-10 mx-auto h-[560px] max-w-5xl bg-[radial-gradient(circle_at_center,rgba(117,182,135,0.18),transparent_70%)]" />

        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-[clamp(2.3rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[#101114]">
            <span className="text-[#3f7e54]">Creative event websites</span> without the complexity.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[18px] leading-8 text-[#5f5966]">
            Eventloom helps you launch a polished RSVP page quickly, then improve every detail before any guest sees it.
          </p>

          <div id="create" className="mx-auto mt-10 max-w-3xl scroll-mt-28 rounded-[1.8rem] border border-emerald-700/35 bg-white/90 p-4 shadow-[0_30px_80px_rgba(31,39,30,0.12)] backdrop-blur-sm sm:p-5">
            <StartEventPrompt
              initialTemplate={initialTemplate}
              authenticated={authenticated}
              authConfigured={authConfigured}
              signupEnabled={signupEnabled}
            />
            <p className="mt-4 text-sm text-[#6a6570]">
              Start for free · First draft in about a minute · Publish only when ready
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-3 text-left md:grid-cols-3">
            {trustHighlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-black/10 bg-white/85 p-4">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                  <item.icon className="size-4" />
                </span>
                <p className="mt-3 text-sm font-semibold text-[#19171d]">{item.title}</p>
                <p className="mt-1 text-[13px] leading-6 text-[#66616a]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-emerald-700/35 bg-[linear-gradient(135deg,#e8efe2,#f5f8ef)] p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="rounded-[1.25rem] border border-black/10 bg-white/92 p-6 shadow-[0_20px_40px_rgba(30,35,30,0.08)]">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                  <card.icon className="size-5" />
                </span>
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[#15141a]">{card.title}</h2>
                <p className="mt-3 text-base leading-7 text-[#5f5966]">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-5 pb-12 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.8rem] border border-black/10 bg-white p-7 text-center shadow-[0_20px_60px_rgba(32,28,37,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Pricing</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[#14131a] sm:text-5xl">$20 when you publish</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#625d66]">
            You can create, test, and refine your event page first. Payment is required only when you publish for guests.
          </p>
          <Link href="#create" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#101111] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black">
            Create my free draft
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section id="questions" className="px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-3xl rounded-[1.6rem] border border-black/10 bg-white px-6 py-8 sm:px-8">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#14131a]">Still deciding?</h2>
          <p className="mt-3 text-sm leading-7 text-[#66616a]">
            You can start a draft first and only share when it feels right. If you need help, visit our{" "}
            <Link className="font-medium text-emerald-700 underline underline-offset-4" href="/contact">
              support page
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
