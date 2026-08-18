"use client";

import { FormEvent, useCallback, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { TURNSTILE_ACTIONS } from "@/lib/security/turnstile-shared";

export function PrivacyRequestForm({ siteKey }: { siteKey: string }) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const onToken = useCallback((token: string) => setTurnstileToken(token), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setStatus("");
    const values = new FormData(event.currentTarget);
    const response = await fetch("/api/privacy/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: values.get("requestType"),
        contact: values.get("contact"),
        eventSlug: values.get("eventSlug") || undefined,
        details: values.get("details"),
        turnstileToken,
      }),
    }).catch(() => null);
    const result = await response?.json().catch(() => ({})) as { request_id?: string } | undefined;
    setBusy(false);
    setTurnstileToken("");
    setTurnstileResetKey((value) => value + 1);
    setStatus(response?.ok ? `Request received. Reference: ${result?.request_id}` : "We could not receive the request. Verify the form and try again.");
    if (response?.ok) event.currentTarget.reset();
  }

  return <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-black/10 bg-white p-6">
    <label className="grid gap-2 text-sm font-medium">Request type<select name="requestType" required className="rounded-xl border border-black/10 px-4 py-3"><option value="access">Access</option><option value="correction">Correction</option><option value="deletion">Deletion</option><option value="information">Information</option><option value="appeal">Appeal</option></select></label>
    <label className="grid gap-2 text-sm font-medium">Safe contact method<input name="contact" required maxLength={200} className="rounded-xl border border-black/10 px-4 py-3" /></label>
    <label className="grid gap-2 text-sm font-medium">Event slug, if applicable<input name="eventSlug" maxLength={63} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="rounded-xl border border-black/10 px-4 py-3" /></label>
    <label className="grid gap-2 text-sm font-medium">Request details<textarea name="details" required maxLength={2000} rows={6} className="rounded-xl border border-black/10 px-4 py-3" /></label>
    <TurnstileWidget siteKey={siteKey} action={TURNSTILE_ACTIONS.privacyRequest} onToken={onToken} resetKey={turnstileResetKey} />
    {!siteKey ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Privacy intake remains unavailable in production until Turnstile is configured.</p> : null}
    <button disabled={busy || (Boolean(siteKey) && !turnstileToken)} className="rounded-full bg-[#1d1d1f] px-6 py-3 text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit privacy request"}</button>
    {status ? <p role="status" className="text-sm">{status}</p> : null}
  </form>;
}
