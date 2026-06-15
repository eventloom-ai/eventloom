import { AppShell } from "@/components/app-shell";

export default function NewEventPage() {
  return (
    <AppShell
      backHref="/app"
      backLabel="My events"
      title="New event"
      description="Describe your celebration and choose a link name. We'll create the first version for you."
      width="narrow"
    >
      <form
        action="/api/events"
        method="post"
        className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] md:p-8"
      >
        <label className="grid gap-2">
          <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Event description</span>
          <textarea
            name="prompt"
            required
            rows={5}
            className="resize-none rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[17px] leading-relaxed outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]"
            placeholder="A warm summer wedding with RSVP, schedule, and photo gallery..."
          />
        </label>

        <label className="mt-5 grid gap-2">
          <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Link name</span>
          <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 focus-within:border-[#0071e3]/50 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]">
            <span className="shrink-0 text-[15px] text-[#6e6e73]">eventloom.ai/</span>
            <input
              name="slug"
              required
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#6e6e73]/60"
              placeholder="summer-wedding"
            />
          </div>
        </label>

        <button
          type="submit"
          className="mt-8 w-full rounded-full bg-[#0071e3] py-3.5 text-[17px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.99]"
        >
          Create first version
        </button>
      </form>
    </AppShell>
  );
}
