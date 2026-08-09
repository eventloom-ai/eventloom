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

  return <section className="eventloom-app-card mt-8 rounded-2xl p-6">
    <h2 className="text-xl font-semibold">Your data</h2>
    <p className="mt-2 text-sm leading-relaxed text-[#66736c]">Exports and deletion require a verified email and an MFA-verified session. Financial and legal records that must be retained are pseudonymized.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <Link href="/api/account" className="eventloom-app-button inline-block rounded-full px-5 py-3 text-sm font-semibold">Download account export</Link>
      <Link href="/privacy/request" className="eventloom-app-button inline-block rounded-full px-5 py-3 text-sm font-semibold">Submit a privacy request</Link>
    </div>
    <div className="mt-8 border-t border-black/10 pt-6"><h3 className="font-semibold text-red-800">Delete account</h3><p className="mt-2 text-sm">This erases creator content and RSVP data. Type DELETE MY ACCOUNT to confirm.</p><div className="mt-4 flex flex-wrap items-end gap-3"><label className="grid min-w-64 gap-2 text-sm font-medium">Confirmation<input aria-describedby="account-deletion-help" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE MY ACCOUNT" className="rounded-xl border border-black/10 px-4 py-3" /></label><button type="button" onClick={removeAccount} disabled={busy || confirmation !== "DELETE MY ACCOUNT"} className="rounded-full bg-red-700 px-5 py-3 text-white disabled:opacity-50">{busy ? "Deleting…" : "Delete permanently"}</button></div><p id="account-deletion-help" className="sr-only">Enter the exact words DELETE MY ACCOUNT.</p>{status ? <p role="alert" className="mt-3 text-sm text-red-800">{status}</p> : null}</div>
  </section>;
}
