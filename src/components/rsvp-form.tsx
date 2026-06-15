"use client";

import { FormEvent, useState } from "react";

export function RsvpForm({ eventId, slug, isOpen }: { eventId: string; slug: string; isOpen: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [attending, setAttending] = useState(true);
  const [partySize, setPartySize] = useState(1);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOpen) return;

    const form = new FormData(event.currentTarget);
    const guestNames = String(form.get("guest_names") ?? "")
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    setStatus("sending");
    setMessage("");

    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        slug,
        first_name: form.get("first_name"),
        last_name: form.get("last_name"),
        email: form.get("email"),
        phone: form.get("phone"),
        is_attending: attending,
        party_size: attending ? partySize : 0,
        guest_names: attending ? guestNames : [],
        answers: { note: String(form.get("note") ?? "") },
      }),
    });

    if (res.ok) {
      setStatus("done");
      event.currentTarget.reset();
      return;
    }

    setStatus("error");
    setMessage("We could not save this RSVP. Please check the form and try again.");
  }

  if (!isOpen) {
    return (
      <section className="rounded-[8px] border border-black/10 bg-white/70 p-6">
        <h2 className="text-2xl font-semibold">RSVPs are closed</h2>
        <p className="mt-2 text-stone-600">This event is no longer accepting responses.</p>
      </section>
    );
  }

  if (status === "done") {
    return (
      <section className="rounded-[8px] border border-[#405448]/20 bg-[#405448] p-6 text-white">
        <h2 className="text-2xl font-semibold">RSVP received</h2>
        <p className="mt-2 text-white/80">Your response has been recorded.</p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[8px] border border-black/10 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a6a3f]">RSVP</p>
        <h2 className="mt-2 text-3xl font-semibold">Confirm your details</h2>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          First name
          <input required name="first_name" className="rounded-[6px] border border-black/15 px-3 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Last name
          <input required name="last_name" className="rounded-[6px] border border-black/15 px-3 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Email
          <input name="email" type="email" className="rounded-[6px] border border-black/15 px-3 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Phone
          <input name="phone" className="rounded-[6px] border border-black/15 px-3 py-3" />
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Will you attend?</legend>
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={() => setAttending(true)} className={`rounded-full px-4 py-2 ${attending ? "bg-[#191713] text-white" : "bg-stone-100"}`}>
            Yes
          </button>
          <button type="button" onClick={() => setAttending(false)} className={`rounded-full px-4 py-2 ${!attending ? "bg-[#191713] text-white" : "bg-stone-100"}`}>
            No
          </button>
        </div>
      </fieldset>

      {attending ? (
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Party size
            <input min={1} max={50} type="number" value={partySize} onChange={(event) => setPartySize(Number(event.target.value))} className="rounded-[6px] border border-black/15 px-3 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Guest names, one per line
            <textarea name="guest_names" rows={4} className="rounded-[6px] border border-black/15 px-3 py-3" placeholder="Include every attendee if party size is more than one." />
          </label>
        </div>
      ) : null}

      <label className="mt-5 grid gap-2 text-sm font-medium">
        Note
        <textarea name="note" rows={3} className="rounded-[6px] border border-black/15 px-3 py-3" />
      </label>

      {message ? <p className="mt-4 text-sm text-red-700">{message}</p> : null}

      <button disabled={status === "sending"} className="mt-6 w-full rounded-full bg-[#405448] px-5 py-4 font-semibold text-white disabled:opacity-60">
        {status === "sending" ? "Sending..." : "Submit RSVP"}
      </button>
    </form>
  );
}
