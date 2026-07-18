import Link from "next/link";
import { CalendarDays, CakeSlice, Gem, Globe2, Heart, LayoutDashboard, PartyPopper, Plus, Sparkles } from "lucide-react";
import { StartEventPrompt } from "@/components/start-event-prompt";

const eventTypes = [
  { label: "Wedding", icon: Heart, prompt: "A wedding celebration with RSVP and guest details." },
  { label: "Birthday", icon: CakeSlice, prompt: "A birthday celebration with RSVP, schedule, and a photo gallery." },
  { label: "Engagement", icon: Gem, prompt: "An elegant engagement celebration with bilingual details and RSVP." },
  { label: "Party", icon: PartyPopper, prompt: "A lively party page with guest replies, dress code, and a bold visual direction." },
];

export function LandingPage({ initialTemplate }: { initialTemplate?: string }) {
  return (
    <main className="min-h-screen bg-[#fbfaf8] text-[#252329]">
      <div className="grid min-h-screen lg:grid-cols-[232px_1fr]">
        <aside className="hidden border-r border-black/[0.07] bg-white p-3 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-2 text-[14px] font-semibold"><span className="grid size-6 place-items-center rounded-md bg-violet-500 text-white"><Sparkles className="size-3.5" /></span> Eventloom</Link>
          <Link href="#create" className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-black/[0.10] bg-[#f8f7f9] px-3 py-2 text-[12px] font-medium transition hover:bg-[#f0edf5]"><Plus className="size-3.5" /> Create an event</Link>
          <nav className="mt-5 grid gap-1 text-[12px] text-[#716d75]">
            <Link href="/" className="flex items-center gap-2 rounded-md bg-violet-50 px-3 py-2 text-violet-800"><Sparkles className="size-3.5" /> Home</Link>
            <Link href="/app" className="flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-black/[0.04] hover:text-[#252329]"><LayoutDashboard className="size-3.5" /> My events</Link>
            <Link href="/demo-wedding" className="flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-black/[0.04] hover:text-[#252329]"><Globe2 className="size-3.5" /> Published sites</Link>
          </nav>
          <div className="mt-auto border-t border-black/[0.07] pt-4 text-[11px] text-[#85818a]"><p className="font-medium text-[#4e4953]">Eventloom Studio</p><p className="mt-1 leading-4">Create an event site, collect replies, and publish when it is ready.</p></div>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex h-14 items-center justify-between border-b border-black/[0.07] bg-white/75 px-5 backdrop-blur lg:px-8"><Link href="/" className="flex items-center gap-2 text-[14px] font-semibold lg:hidden"><span className="grid size-6 place-items-center rounded-md bg-violet-500 text-white"><Sparkles className="size-3.5" /></span> Eventloom</Link><div className="hidden text-[12px] text-[#85818a] lg:block">Your event workspace</div><Link href="/app" className="rounded-md bg-[#252329] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-black">My events</Link></header>

          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-16 sm:py-24">
            <div className="mx-auto w-full max-w-3xl text-center">
              <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-violet-600">Eventloom agent</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">What kind of event are you planning?</h1>
              <p className="mx-auto mt-3 max-w-xl text-[14px] leading-6 text-[#716d75]">Eventloom turns your idea into a unique event website, gathers guest RSVPs, and gives you one beautiful link to share. Describe your occasion in one sentence, then shape it in the studio.</p>
            </div>

            <div id="create" className="mt-8"><StartEventPrompt initialTemplate={initialTemplate} /></div>

            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
              {eventTypes.map((type) => <Link key={type.label} href={`/studio?brief=${encodeURIComponent(type.prompt)}`} className="group flex w-[118px] flex-col items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 py-4 text-[11px] text-[#716d75] shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-[#252329]"><span className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600 transition group-hover:bg-violet-100"><type.icon className="size-4" /></span>{type.label}</Link>)}
            </div>

            <div className="mx-auto mt-16 w-full max-w-3xl">
              <div className="flex items-center justify-between"><h2 className="text-[13px] font-semibold">Continue planning</h2><Link href="/app" className="text-[12px] text-violet-600 hover:underline">View all events</Link></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Link href="/demo-wedding" className="group rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm transition hover:bg-[#fffafb]"><div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-500"><Heart className="size-4" /></span><span className="text-[10px] text-[#8b858d]">Sample</span></div><p className="mt-4 text-[13px] font-semibold">Wedding site example</p><p className="mt-1 text-[11px] text-[#77717a]">See an Eventloom site with RSVP.</p></Link>
                <Link href="/app" className="group rounded-xl border border-dashed border-black/[0.14] bg-[#fdfcff] p-4 transition hover:border-violet-300 hover:bg-violet-50/40"><span className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600"><CalendarDays className="size-4" /></span><p className="mt-4 text-[13px] font-semibold">Your event projects</p><p className="mt-1 text-[11px] text-[#77717a]">Open drafts and published events.</p></Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
