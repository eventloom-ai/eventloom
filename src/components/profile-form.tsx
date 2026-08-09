"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const normalizedName = fullName.trim();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || normalizedName.length < 2 || normalizedName === savedName) return;
    setBusy(true);
    setError("");
    setStatus("");
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: normalizedName }),
    }).catch(() => null);
    const result = await response?.json().catch(() => null) as { fullName?: string } | null;
    setBusy(false);
    if (!response?.ok || !result?.fullName) {
      setError(response?.status === 403
        ? "Confirm your email before changing your profile."
        : "We couldn’t save that change. Please try again.");
      return;
    }
    setFullName(result.fullName);
    setSavedName(result.fullName);
    setStatus("Profile saved.");
    router.refresh();
  }

  return (
    <section className="eventloom-app-card rounded-2xl p-6 sm:p-7">
      <h2 className="text-xl font-semibold">About you</h2>
      <p className="mt-2 text-sm leading-6 text-[#66736c]">This name appears only inside your Eventloom account.</p>
      <form onSubmit={submit} className="mt-6">
        <label className="grid gap-2 text-sm font-medium text-[#302821]">
          Display name
          <input
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              setError("");
              setStatus("");
            }}
            className="eventloom-app-field rounded-xl border px-4 py-3 text-base outline-none transition"
          />
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || normalizedName.length < 2 || normalizedName === savedName}
            className="eventloom-app-button-primary rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save name"}
          </button>
          {status ? <p role="status" className="text-sm text-emerald-700">{status}</p> : null}
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
