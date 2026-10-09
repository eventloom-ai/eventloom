"use client";

import { FormEvent, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { REPORT_REASONS } from "@/lib/safety/report-reasons";
import { TURNSTILE_ACTIONS } from "@/lib/security/turnstile-shared";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugFromParam(value: string | null) {
  const slug = (value ?? "").trim().toLowerCase();
  return SLUG_PATTERN.test(slug) && slug.length <= 63 ? slug : "";
}

const errorMessages: Record<string, string> = {
  verification_required: "Please complete the verification check, then send the report again.",
  try_later: "You’ve sent several reports recently. Please try again later, or email us if it’s urgent.",
  invalid_request: "Check the page address and reason, then try again.",
};

export function AbuseReportForm({ siteKey, host }: { siteKey: string; host: string }) {
  const searchParams = useSearchParams();
  const initialSlug = slugFromParam(searchParams.get("event"));
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const onToken = useCallback((token: string) => setTurnstileToken(token), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setStatus(null);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: String(values.get("slug") ?? "").trim().toLowerCase(),
        reason: values.get("reason"),
        details: values.get("details") ?? "",
        email: values.get("email") ?? "",
        turnstileToken,
      }),
    }).catch(() => null);
    const result = await response?.json().catch(() => ({})) as { error?: string } | undefined;
    setBusy(false);
    setTurnstileToken("");
    setTurnstileResetKey((value) => value + 1);
    if (response?.ok) {
      form.reset();
      setStatus({ ok: true, message: "Thank you. Your report was received and will be reviewed. We may restrict the page while we look into it." });
    } else {
      setStatus({ ok: false, message: errorMessages[result?.error ?? ""] ?? "We couldn’t send the report right now. Please try again in a moment." });
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-black/10 bg-white p-6">
      <label className="grid gap-2 text-sm font-medium">
        Page address
        <span className="flex items-center rounded-xl border border-black/10 focus-within:ring-2 focus-within:ring-black/20">
          <span className="pl-4 text-[#6e6e73]">{host}/</span>
          <input name="slug" required defaultValue={initialSlug} maxLength={63} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} className="min-w-0 flex-1 rounded-r-xl px-1 py-3 outline-none" />
        </span>
      </label>
      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-2 font-medium">What’s wrong with this page?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {REPORT_REASONS.map((reason, index) => (
            <label key={reason.value} className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3">
              <input type="radio" name="reason" value={reason.value} required defaultChecked={index === 0} />
              {reason.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2 text-sm font-medium">
        Details <span className="font-normal text-[#6e6e73]">What did you see? For copyright, name the work you own.</span>
        <textarea name="details" maxLength={2000} rows={5} className="rounded-xl border border-black/10 px-4 py-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Your email <span className="font-normal text-[#6e6e73]">Optional — only if you’d like us to follow up.</span>
        <input name="email" type="email" maxLength={254} autoComplete="email" className="rounded-xl border border-black/10 px-4 py-3" />
      </label>
      <TurnstileWidget siteKey={siteKey} action={TURNSTILE_ACTIONS.abuseReport} onToken={onToken} resetKey={turnstileResetKey} />
      <button disabled={busy || (Boolean(siteKey) && !turnstileToken)} className="min-h-11 rounded-full bg-[#1d1d1f] px-6 py-3 font-semibold text-white disabled:opacity-50">
        {busy ? "Sending…" : "Send report"}
      </button>
      {status ? <p role="status" className={status.ok ? "text-sm text-emerald-800" : "text-sm text-red-700"}>{status.message}</p> : null}
    </form>
  );
}
