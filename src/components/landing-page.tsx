import Link from "next/link";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#191713]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
        <nav className="flex items-center justify-between border-b border-black/10 pb-5">
          <Link className="text-lg font-semibold" href="/">
            Eventloom AI
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link className="rounded-full px-4 py-2 hover:bg-black/5" href="/demo-wedding">
              Demo
            </Link>
            <Link className="rounded-full bg-[#191713] px-4 py-2 text-white" href="/app">
              My events
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-[#8a6a3f]">
              Custom event websites, ready to share
            </p>
            <h1 className="max-w-4xl text-6xl font-semibold leading-[0.92] tracking-normal sm:text-7xl lg:text-8xl">
              Describe the event. Publish the site.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-stone-700">
              Eventloom helps you make a one-of-a-kind event website, collect guest replies, take payment, and give every paid event its own website address.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="rounded-full bg-[#405448] px-6 py-4 text-center font-semibold text-white" href="/app/events/new">
                Start an event
              </Link>
              <Link className="rounded-full border border-black/15 px-6 py-4 text-center font-semibold" href="/demo-wedding">
                View sample page
              </Link>
            </div>
          </div>

          <div className="rounded-[8px] border border-black/10 bg-white p-4 shadow-[0_24px_70px_rgba(25,23,19,0.12)]">
            <div className="rounded-[6px] bg-[#191713] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-[#d7bd8d]">What you ask for</p>
              <p className="mt-5 text-2xl leading-10">
                “Create a luxury bilingual wedding website with guest replies, a personal website address, and a formal evening schedule.”
              </p>
            </div>
            <div className="grid gap-3 pt-4 sm:grid-cols-3">
              {["Custom design", "Guest replies", "Website address"].map((label) => (
                <div key={label} className="rounded-[6px] bg-[#f7f4ee] p-4 text-sm font-semibold">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
