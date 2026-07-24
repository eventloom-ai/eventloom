"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Preference = "accepted" | "declined" | "unset";

export function ReferralConsent({
  referralJourney,
  manage = false,
}: {
  referralJourney?: string;
  manage?: boolean;
}) {
  const [preference, setPreference] = useState<Preference | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/referrals/preferences")
      .then((response) => response.json())
      .then((payload: { enabled?: boolean; preference?: Preference }) => {
        if (!active) return;
        setEnabled(Boolean(payload.enabled));
        setPreference(payload.preference ?? "unset");
      })
      .catch(() => {
        if (active) setPreference("unset");
      });
    return () => { active = false; };
  }, []);

  async function choose(action: "accept" | "decline" | "withdraw") {
    setSaving(true);
    const response = await fetch("/api/referrals/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, referral: referralJourney }),
    }).catch(() => null);
    if (response?.ok) setPreference(action === "accept" ? "accepted" : "declined");
    setSaving(false);
  }

  if (!enabled || preference === null) return null;

  if (manage) {
    return (
      <section className="mt-10 rounded-2xl border border-black/10 bg-white p-5" aria-labelledby="referral-preferences-title">
        <h2 id="referral-preferences-title" className="text-lg font-semibold">Referral preferences</h2>
        <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
          {preference === "accepted"
            ? "Eventloom may remember the event that introduced you for up to 30 days."
            : "Persistent referral measurement is currently off."}
        </p>
        {preference === "accepted" ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void choose("withdraw")}
            className="mt-4 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Withdraw and clear referral
          </button>
        ) : null}
      </section>
    );
  }

  if (!referralJourney || preference !== "unset") return null;
  return (
    <aside
      aria-label="Referral preferences"
      className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-5 text-[#252329] shadow-[0_24px_80px_rgba(37,35,41,0.22)] sm:flex sm:items-center sm:gap-6"
    >
      <div className="flex-1">
        <p className="text-sm font-semibold">Remember how you found Eventloom?</p>
        <p className="mt-1 text-xs leading-5 text-[#6f6a72]">
          With your permission, we’ll remember this referral for 30 days. You can continue without it.{" "}
          <Link href="/legal/cookies" className="underline underline-offset-2">Cookie details</Link>
        </p>
      </div>
      <div className="mt-4 grid shrink-0 gap-2 sm:mt-0">
        <button
          type="button"
          disabled={saving}
          onClick={() => void choose("accept")}
          className="rounded-full bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Remember for 30 days
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void choose("decline")}
          className="rounded-full border border-black/10 px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
        >
          Continue without remembering
        </button>
      </div>
    </aside>
  );
}
