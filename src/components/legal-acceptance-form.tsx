"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LegalAcceptanceForm({ version }: { version: string }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setStatus("");
    const response = await fetch("/api/legal/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ age18: accepted, accepted, version }) });
    setBusy(false);
    if (response.ok) { router.push("/app/security"); router.refresh(); }
    else setStatus("Acceptance is unavailable until the reviewed legal versions are activated.");
  }
  return <section className="mt-8 rounded-2xl border border-black/10 bg-white p-6"><label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I am 18 or older and accept the <Link className="underline" href="/legal/terms" target="_blank">Terms</Link>, <Link className="underline" href="/legal/privacy" target="_blank">Privacy Policy</Link>, and <Link className="underline" href="/legal/acceptable-use" target="_blank">Acceptable Use Policy</Link>, version {version}.</span></label><button type="button" onClick={submit} disabled={!accepted || busy} className="mt-5 rounded-full bg-[#1d1d1f] px-6 py-3 text-white disabled:opacity-50">Accept and continue</button>{status ? <p role="alert" className="mt-4 text-sm text-amber-900">{status}</p> : null}</section>;
}
