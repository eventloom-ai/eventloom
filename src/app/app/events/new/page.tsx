import Link from "next/link";

export default function NewEventPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-8 text-[#191713]">
      <section className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-stone-600" href="/app">
          Back to my events
        </Link>
        <h1 className="mt-6 text-5xl font-semibold">Create an event page</h1>
        <p className="mt-4 text-lg leading-8 text-stone-700">
          Describe the event you want, choose the link name, and Eventloom will create the first version for you.
        </p>

        <form action="/api/events" method="post" className="mt-8 grid gap-4 rounded-[8px] border border-black/10 bg-white p-5">
          <label className="grid gap-2 text-sm font-medium">
            Event description
            <textarea name="prompt" required rows={5} className="rounded-[6px] border border-black/15 px-3 py-3" placeholder="Create a luxury launch party for Eventloom AI..." />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Link name
            <input name="slug" required className="rounded-[6px] border border-black/15 px-3 py-3" placeholder="eventloom-launch" />
          </label>
          <button className="rounded-full bg-[#191713] px-5 py-3 font-semibold text-white">Create first version</button>
        </form>
      </section>
    </main>
  );
}
