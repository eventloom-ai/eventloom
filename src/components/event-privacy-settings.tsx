"use client";

import { FormEvent, useState } from "react";

type Initial = { controllerLegalName: string; privacyContact: string; collectionPurpose: string; optionalFieldJustification: string; endsAt: string; timezone: string };

export function EventPrivacySettings({ eventId, initial }: { eventId: string; initial: Initial }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setStatus("");
    const values = new FormData(event.currentTarget);
    const response = await fetch(`/api/events/${eventId}/privacy`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ controllerLegalName: values.get("controllerLegalName"), privacyContact: values.get("privacyContact"), collectionPurpose: values.get("collectionPurpose"), optionalFieldJustification: values.get("optionalFieldJustification"), endsAt: new Date(String(values.get("endsAt"))).toISOString(), timezone: values.get("timezone") }) });
    setBusy(false); setStatus(response.ok ? "Saved. This event now has the required privacy and retention details." : "The settings could not be saved. Check every field and try again.");
  }
  const localEnd = initial.endsAt ? initial.endsAt.slice(0, 16) : "";
  return <form onSubmit={submit} className="eventloom-app-card mt-8 grid gap-5 rounded-[1.5rem] p-6 sm:p-8"><label className="grid gap-2 text-sm font-medium">Creator/controller legal name<input name="controllerLegalName" required maxLength={160} defaultValue={initial.controllerLegalName} className="eventloom-app-field rounded-xl border px-4 py-3" /></label><label className="grid gap-2 text-sm font-medium">Privacy contact email<input type="email" name="privacyContact" required maxLength={160} defaultValue={initial.privacyContact} className="eventloom-app-field rounded-xl border px-4 py-3" /></label><label className="grid gap-2 text-sm font-medium">Why RSVP data is collected<textarea name="collectionPurpose" required minLength={10} maxLength={500} defaultValue={initial.collectionPurpose} rows={4} className="eventloom-app-field rounded-xl border px-4 py-3" /></label><label className="grid gap-2 text-sm font-medium">Why optional contact fields are needed<textarea name="optionalFieldJustification" required minLength={10} maxLength={500} defaultValue={initial.optionalFieldJustification} rows={4} className="eventloom-app-field rounded-xl border px-4 py-3" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Event end date and time<input type="datetime-local" name="endsAt" required defaultValue={localEnd} className="eventloom-app-field rounded-xl border px-4 py-3" /></label><label className="grid gap-2 text-sm font-medium">IANA timezone<input name="timezone" required defaultValue={initial.timezone || "America/Toronto"} className="eventloom-app-field rounded-xl border px-4 py-3" /></label></div><p className="text-sm leading-6 text-[#6d6055]">RSVP personal data is scheduled for deletion 90 days after this end time unless a documented legal hold applies.</p><button disabled={busy} className="eventloom-app-button-primary rounded-full px-6 py-3 text-sm font-medium disabled:opacity-50">{busy ? "Saving…" : "Save launch details"}</button>{status ? <p role="status" className="text-sm text-[#604139]">{status}</p> : null}</form>;
}
