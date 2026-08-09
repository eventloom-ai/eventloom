import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventloomLogo } from "@/components/logo";
import { LandingMobileNavigation } from "@/components/landing-mobile-navigation";
import { StartEventPrompt } from "@/components/start-event-prompt";

const steps = [
  ["01", "Describe the occasion", "Tell us what you are hosting and the atmosphere you want to create."],
  ["02", "Shape the first draft", "Refine the page, event details, and guest questions until it is right."],
  ["03", "Share when ready", "Publish your link and manage every guest response from Eventloom."],
] as const;

const frequentlyAsked = [
  { question: "Do I need to know how to build a website?", answer: "No. Describe the event the way you would explain it to a friend. Eventloom creates the first draft, and you can request changes in plain language." },
  { question: "Can I see the site before I pay?", answer: "Yes. Create and edit your draft first. Payment is only requested when you are ready to publish it for guests." },
  { question: "What do guests need to do?", answer: "Guests open one link, read the event details, and send their RSVP. They do not need an Eventloom account." },
  { question: "Who can see guest information?", answer: "RSVP details are available only to the event creator and authorized collaborators. Eventloom does not sell guest information or use it for advertising." },
];

function EventloomShowcase() {
  return (
    <div className="relative mx-auto max-w-6xl rounded-[2rem] border border-[#302821]/10 bg-[#fffaf3] p-3 shadow-[0_28px_80px_rgba(65,43,28,0.12)] sm:p-5">
      <div className="grid overflow-hidden rounded-[1.35rem] border border-[#302821]/10 bg-[#f7efe5] lg:grid-cols-[1.22fr_0.78fr]">
        <article className="relative min-h-[420px] overflow-hidden bg-[#4a2d2a] px-7 py-8 text-[#fff9f2] sm:px-11 sm:py-12">
          <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_62%_4%,rgba(202,158,117,0.58),transparent_58%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/20 pb-4 text-[11px] uppercase tracking-[0.18em] text-[#f5ddc8]"><span>The evening of</span><span>June 14, 2027</span></div>
            <div className="max-w-md py-10"><p className="font-[family-name:var(--font-playfair)] text-[clamp(3.25rem,8vw,6.6rem)] leading-[0.82] tracking-[-0.055em]">Amara<br />&amp; Leo</p><p className="mt-7 max-w-xs text-sm leading-6 text-[#f7e7da]/75">A garden celebration, dinner under the lights, and a long night with the people we love.</p></div>
            <div className="flex items-end justify-between border-t border-white/20 pt-4 text-sm text-[#f7e7da]"><span>Hawthorn House</span><span>Toronto, Ontario</span></div>
          </div>
        </article>
        <aside className="flex min-h-[420px] flex-col justify-between bg-[#fffaf3] p-7 text-[#302821] sm:p-9">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6153]">Guest replies</p><p className="mt-3 font-[family-name:var(--font-playfair)] text-4xl tracking-[-0.045em]">A clear yes.</p><p className="mt-3 max-w-xs text-sm leading-6 text-[#74675d]">The details guests need, and the answers you need to plan confidently.</p></div>
          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-[#302821]/10 bg-white px-4 py-3.5"><div className="flex items-center justify-between text-sm"><span className="font-medium">Responses</span><span className="font-[family-name:var(--font-playfair)] text-xl">128</span></div><div className="mt-3 h-px bg-[#302821]/10" /><div className="mt-3 flex justify-between text-xs text-[#74675d]"><span>Attending 112</span><span>Pending 16</span></div></div>
            <div className="rounded-2xl border border-[#302821]/10 bg-[#f3e7d9] px-4 py-3.5 text-sm leading-6 text-[#574239]">Dietary notes, party sizes, and special messages stay with the event—not scattered across your inbox.</div>
          </div>
        </aside>
      </div>
      <p className="px-2 pt-4 text-center text-xs leading-5 text-[#786b60]">An Eventloom site gives guests a polished place to arrive—and you a simple way to stay organized.</p>
    </div>
  );
}

export function LandingPage({ initialTemplate, authenticated = false, authConfigured = true, signupEnabled = false }: { initialTemplate?: string; authenticated?: boolean; authConfigured?: boolean; signupEnabled?: boolean }) {
  const accountHref = authenticated || !authConfigured ? "/app" : "/login?next=/app";
  const accountLabel = authenticated ? "My events" : authConfigured ? "Sign in" : "Open local demo";
  const createLabel = authenticated ? "New event" : "Create an event";

  return (
    <main id="top" className="overflow-hidden bg-[#e7ecdf] text-[#302821]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#16121c]/80 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-base font-semibold text-white" aria-label="Eventloom home"><EventloomLogo markClassName="size-7" /></Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-white/65 md:flex"><Link href="#product" className="transition hover:text-white">Product</Link><Link href="#how-it-works" className="transition hover:text-white">How it works</Link><Link href="#pricing" className="transition hover:text-white">Pricing</Link><Link href="#questions" className="transition hover:text-white">Questions</Link><Link href="/contact" className="transition hover:text-white">Contact</Link></nav>
          <div className="flex items-center gap-2"><Link href={accountHref} className="rounded-full px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white sm:px-4">{accountLabel}</Link><Link href="#top" className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#211927] transition hover:bg-[#f9e7df] sm:inline-flex">{createLabel}</Link><LandingMobileNavigation /></div>
        </div>
      </header>

      <section className="eventloom-hero relative isolate min-h-[calc(100svh-4rem)] overflow-hidden px-5 pb-20 pt-24 text-white sm:px-8 sm:pb-28 sm:pt-32">
        <div aria-hidden="true" className="eventloom-water-reflection"><span /><span /><span /></div>
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">Event websites and RSVPs, made personal</p>
          <h1 className="mx-auto mt-6 font-[family-name:var(--font-playfair)] text-[clamp(2rem,8.5vw,6.8rem)] leading-[0.9] tracking-[-0.065em]"><span className="block whitespace-nowrap">Make the invitation</span><span className="block whitespace-nowrap">everyone remembers.</span></h1>
          <div id="create" className="mx-auto mt-10 w-full max-w-xl scroll-mt-28"><StartEventPrompt initialTemplate={initialTemplate} authenticated={authenticated} authConfigured={authConfigured} signupEnabled={signupEnabled} /></div>
          <p className="mt-5 text-[12px] leading-6 text-white/55">Start privately · Publish when ready · Guest data stays private</p>
        </div>
      </section>

      <section id="product" className="scroll-mt-24 border-y border-[#48686a]/15 px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto max-w-6xl"><div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Made for the moment</p><h2 className="mt-4 font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">The invitation, the details, and the replies.</h2></div><EventloomShowcase /></div></section>

      <section id="how-it-works" className="scroll-mt-24 bg-[#302821] px-5 py-24 text-[#fff9f2] sm:px-8 sm:py-32"><div className="mx-auto max-w-7xl"><div className="grid gap-10 border-b border-white/15 pb-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">A simpler way to plan</p><h2 className="mt-5 max-w-lg font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">From an idea to a link worth sharing.</h2></div><p className="max-w-xl text-base leading-8 text-[#eadbd0]/70">Make decisions in the order that feels natural. Start with the occasion, then refine the page as the guest list and plans take shape.</p></div><ol className="grid divide-y divide-white/15 lg:grid-cols-3 lg:divide-x lg:divide-y-0">{steps.map(([number, title, description]) => <li key={number} className="py-8 first:lg:pr-8 lg:px-8 lg:py-10 lg:first:pl-0"><p className="text-[11px] font-semibold tracking-[0.18em] text-[#dfb89f]">{number}</p><h3 className="mt-8 text-xl font-medium tracking-[-0.025em]">{title}</h3><p className="mt-3 max-w-xs text-sm leading-7 text-[#eadbd0]/65">{description}</p></li>)}</ol></div></section>

      <section id="pricing" className="scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32"><div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Simple pricing</p><h2 className="mt-5 max-w-xl font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">Make it yours before you decide.</h2><p className="mt-6 max-w-lg text-base leading-8 text-[#6d6055]">Create and refine your event site first. Pay only when you are ready to publish it for your guests.</p></div><article className="border-y border-[#302821]/15 py-7 sm:px-1 sm:py-9"><div className="flex items-end justify-between gap-4"><div><p className="text-lg font-semibold">One published event</p><p className="mt-1 text-sm text-[#74675d]">One year of Eventloom service</p></div><p className="font-[family-name:var(--font-playfair)] text-5xl tracking-[-0.055em]">$20</p></div><ul className="mt-8 space-y-3 border-t border-[#302821]/10 pt-6 text-sm leading-6 text-[#5f5248]"><li>Custom event website and shareable Eventloom link</li><li>Guest RSVP collection and response management</li><li>Plain-language editing and secure hosting</li></ul><p className="mt-6 text-xs leading-6 text-[#796c61]">A custom domain is optional and charged separately at the live registrar cost shown before payment. Taxes, when applicable, are shown at checkout.</p><Link href="#top" className="mt-7 inline-flex items-center gap-2 border-b border-[#302821] pb-1 text-sm font-semibold text-[#302821] transition hover:border-[#a37561] hover:text-[#8a6153]">Create your draft <ArrowRight className="size-4" aria-hidden="true" /></Link></article></div></section>

      <section id="questions" className="scroll-mt-24 border-y border-[#48686a]/15 bg-[#eff2e9] px-5 py-24 sm:px-8 sm:py-32"><div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.72fr_1.28fr]"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Questions, answered</p><h2 className="mt-5 max-w-sm font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em]">Everything you need to know before you begin.</h2><p className="mt-6 max-w-sm text-sm leading-7 text-[#6d6055]">Need a hand with something specific? Visit our <Link className="font-semibold text-[#604139] underline decoration-[#c19a7d] underline-offset-4 transition hover:text-[#8a6153]" href="/contact">support page</Link>.</p></div><div className="border-t border-[#302821]/15">{frequentlyAsked.map((item) => <details key={item.question} className="group border-b border-[#302821]/15 py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold marker:content-none">{item.question}<span aria-hidden="true" className="text-xl font-normal text-[#a37561] transition group-open:rotate-45">+</span></summary><p className="max-w-2xl pt-4 text-sm leading-7 text-[#6d6055]">{item.answer}</p></details>)}</div></div></section>

      <section className="px-5 py-20 sm:px-8 sm:py-28"><div className="mx-auto max-w-6xl border-y border-[#302821]/15 py-14 text-center sm:py-20"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Start with what you know</p><h2 className="mx-auto mt-5 max-w-3xl font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-6xl">One place for the event your guests will remember.</h2><p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#6d6055]">Tell us about the occasion. You can change every detail before your link is shared.</p><Link href="#top" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#302821] px-6 py-3.5 text-sm font-semibold text-[#fffaf3] transition hover:bg-[#4a2d2a]">Create your event <ArrowRight className="size-4" aria-hidden="true" /></Link></div></section>
    </main>
  );
}
