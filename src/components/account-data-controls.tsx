"use client";

import { useState } from "react";
import Link from "next/link";

export function AccountDataControls() {
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function removeAccount() {
    setBusy(true); setStatus("");
    const response = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (response.ok) window.location.assign("/");
    else setStatus(result.error === "active_domain_transfer_required" ? "Transfer or resolve active domains before deleting the account." : "Account deletion could not be completed.");
  }

  return <section className="mt-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold">Your data</h2>
    <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">Exports and deletion require a verified email and an MFA-verified session. Financial and legal records that must be retained are pseudonymized.</p>
    <Link href="/api/account" className="mt-5 inline-block rounded-full border border-black/15 px-5 py-3 text-sm font-semibold">Download account export</Link>
    <div className="mt-8 border-t border-black/10 pt-6"><h3 className="font-semibold text-red-800">Delete account</h3><p className="mt-2 text-sm">This erases creator content and RSVP data. Type DELETE MY ACCOUNT to confirm.</p><div className="mt-4 flex flex-wrap gap-3"><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-w-64 rounded-xl border border-black/10 px-4 py-3" /><button type="button" onClick={removeAccount} disabled={busy || confirmation !== "DELETE MY ACCOUNT"} className="rounded-full bg-red-700 px-5 py-3 text-white disabled:opacity-50">Delete permanently</button></div>{status ? <p role="alert" className="mt-3 text-sm text-red-800">{status}</p> : null}</div>
  </section>;
}
