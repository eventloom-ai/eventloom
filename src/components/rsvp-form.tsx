"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { optionalFormString, rsvpErrorMessage, rsvpPartySize } from "@/lib/form-values";
import type { RsvpField } from "@/lib/types";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { TURNSTILE_ACTIONS } from "@/lib/security/turnstile-shared";

const defaultFields: RsvpField[] = ["name", "attendance", "party_size", "guest_names", "email", "phone", "note"];

export function RsvpForm({ formToken, turnstileSiteKey, privacyContact, isOpen, isDraft = false, fields = defaultFields, className = "" }: { formToken: string; turnstileSiteKey: string; privacyContact?: string; isOpen: boolean; isDraft?: boolean; fields?: RsvpField[]; className?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [attending, setAttending] = useState(true);
  const [partySize, setPartySize] = useState(1);
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const idempotencyKey = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOpen) return;

    // currentTarget is null once the handler awaits, so keep the element for the reset below.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const guestNames = String(form.get("guest_names") ?? "")
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    setStatus("sending");
    setMessage("");
    idempotencyKey.current ??= crypto.randomUUID();

    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_token: formToken,
        turnstile_token: turnstileToken,
        idempotency_key: idempotencyKey.current,
        first_name: form.get("first_name"),
        last_name: form.get("last_name"),
        email: optionalFormString(form.get("email")),
        phone: optionalFormString(form.get("phone")),
        is_attending: attending,
        party_size: rsvpPartySize({ attending, hasPartySizeField: fields.includes("party_size"), partySize, guestNames }),
        guest_names: attending ? guestNames : [],
        answers: { note: String(form.get("note") ?? ""), meal_preference: String(form.get("meal_preference") ?? "") },
      }),
    }).catch(() => null);

    if (res?.ok) {
      idempotencyKey.current = null;
      setStatus("done");
      formElement.reset();
      return;
    }

    const payload = res ? await res.json().catch(() => null) as { error?: string } | null : null;
    setTurnstileToken("");
    setTurnstileResetKey((value) => value + 1);
    setStatus("error");
    setMessage(rsvpErrorMessage(res ? (payload?.error ?? (res.status === 429 ? "try_later" : null)) : "network_error"));
  }

  if (!isOpen) {
    // A draft has never accepted replies, so "no longer accepting" would mislead the host previewing it.
    return (
      <section className={`rounded-[8px] border border-black/10 bg-white/70 p-6 ${className}`}>
        <h2 className="text-2xl font-semibold">{isDraft ? "RSVPs are not open yet" : "Guest replies are closed"}</h2>
        <p className="mt-2 text-stone-600">{isDraft ? "RSVPs open when this event is published." : "This event is no longer accepting responses."}</p>
      </section>
    );
  }

  if (status === "done") {
    return (
      <section className={`rounded-[8px] border border-[#405448]/20 bg-[#405448] p-6 text-white ${className}`}>
        <h2 className="text-2xl font-semibold">Reply received</h2>
        <p className="mt-2 text-white/80">Your response has been recorded.</p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className={`rounded-[8px] border border-black/10 bg-white p-5 shadow-sm ${className}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a6a3f]">Guest reply</p>
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
        {fields.includes("email") ? <label className="grid gap-2 text-sm font-medium">
          Email
          <input name="email" type="email" className="rounded-[6px] border border-black/15 px-3 py-3" />
        </label> : null}
        {fields.includes("phone") ? <label className="grid gap-2 text-sm font-medium">
          Phone
          <input name="phone" className="rounded-[6px] border border-black/15 px-3 py-3" />
        </label> : null}
      </div>

      {fields.includes("attendance") ? <fieldset className="mt-5">
        <legend className="text-sm font-medium">Will you attend?</legend>
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={() => setAttending(true)} className={`rounded-full px-4 py-2 ${attending ? "bg-[#191713] text-white" : "bg-stone-100"}`}>
            Yes
          </button>
          <button type="button" onClick={() => setAttending(false)} className={`rounded-full px-4 py-2 ${!attending ? "bg-[#191713] text-white" : "bg-stone-100"}`}>
            No
          </button>
        </div>
      </fieldset> : null}

      {attending ? (
        <div className="mt-5 grid gap-4">
          {fields.includes("party_size") ? <label className="grid gap-2 text-sm font-medium">
            Party size
            <input min={1} max={50} type="number" value={partySize} onChange={(event) => setPartySize(Number(event.target.value))} className="rounded-[6px] border border-black/15 px-3 py-3" />
          </label> : null}
          {fields.includes("guest_names") ? <label className="grid gap-2 text-sm font-medium">
            Guest names, one per line
            <textarea name="guest_names" rows={4} className="rounded-[6px] border border-black/15 px-3 py-3" placeholder="Include every attendee if party size is more than one." />
          </label> : null}
          {fields.includes("meal_preference") ? <label className="grid gap-2 text-sm font-medium">Meal preference<input name="meal_preference" className="rounded-[6px] border border-black/15 px-3 py-3" /></label> : null}
        </div>
      ) : null}

      {fields.includes("note") ? <label className="mt-5 grid gap-2 text-sm font-medium">
        Note
        <textarea name="note" rows={3} className="rounded-[6px] border border-black/15 px-3 py-3" />
      </label> : null}

      {message ? <p className="mt-4 text-sm text-red-700">{message}</p> : null}

      <div className="mt-5"><TurnstileWidget siteKey={turnstileSiteKey} action={TURNSTILE_ACTIONS.publicRsvp} onToken={setTurnstileToken} resetKey={turnstileResetKey} /></div>
      <p className="mt-4 text-xs leading-relaxed text-stone-600">Your reply is collected for this event by its creator and processed by Eventloom. It is not sold or used for advertising. {privacyContact ? <>Privacy contact: {privacyContact}. </> : null}<Link className="underline" href="/legal/privacy">Privacy details</Link>.</p>

      <button disabled={status === "sending" || (Boolean(turnstileSiteKey) && !turnstileToken)} className="mt-6 w-full rounded-full bg-[#405448] px-5 py-4 font-semibold text-white disabled:opacity-60">
        {status === "sending" ? "Sending..." : "Send reply"}
      </button>
    </form>
  );
}
