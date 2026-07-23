"use client";

import { Bug, Check, Heart, Lightbulb, MessageCircleQuestion, MessageSquareText, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TurnstileWidget } from "@/components/turnstile-widget";

const categories = [
  { value: "bug", label: "Something broke", icon: Bug },
  { value: "confusing", label: "Something was confusing", icon: MessageCircleQuestion },
  { value: "idea", label: "I have an idea", icon: Lightbulb },
  { value: "praise", label: "I liked something", icon: Heart },
] as const;

type FeedbackCategory = (typeof categories)[number]["value"];

export function FeedbackWidget({ turnstileSiteKey = "" }: { turnstileSiteKey?: string }) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("confusing");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || message.trim().length < 10) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        rating: rating ?? undefined,
        message: message.trim(),
        pagePath: pathname,
        turnstileToken,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const payload = await response?.json().catch(() => null) as { error?: string } | null;
      setError(
        payload?.error === "try_later"
          ? "Thanks for helping. Please wait a little before sending more feedback."
          : payload?.error === "verification_required"
            ? "Complete the security check and try again."
            : "We couldn’t send that right now. Please try again.",
      );
      return;
    }
    setSent(true);
    setMessage("");
    setRating(null);
    window.setTimeout(() => {
      setOpen(false);
      setSent(false);
    }, 1800);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
        className="fixed bottom-5 right-5 z-[80] inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-[#1d1d1f] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        aria-haspopup="dialog"
      >
        <MessageSquareText className="size-4" />
        Feedback
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/35 p-3 backdrop-blur-sm sm:place-items-center sm:p-6" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setOpen(false);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[0_35px_100px_rgba(0,0,0,0.30)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Help us improve</p>
                <h2 id="feedback-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#1d1d1f]">How can we make this easier?</h2>
                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">Tell us what happened on this page. You don’t need to write a formal report.</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f5f5f7] text-[#424245] hover:bg-[#e8e8ed]" aria-label="Close feedback">
                <X className="size-4" />
              </button>
            </div>

            {sent ? (
              <div className="my-12 text-center" role="status">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-6" /></span>
                <p className="mt-4 text-lg font-semibold">Thank you—that reached us.</p>
                <p className="mt-2 text-sm text-[#6e6e73]">Your feedback helps us find friction and bugs faster.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6">
                <fieldset>
                  <legend className="text-sm font-semibold text-[#1d1d1f]">What best describes it?</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {categories.map((item) => (
                      <label key={item.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${category === item.value ? "border-violet-300 bg-violet-50 text-violet-950" : "border-black/10 hover:bg-[#f8f8fa]"}`}>
                        <input className="sr-only" type="radio" name="category" value={item.value} checked={category === item.value} onChange={() => setCategory(item.value)} />
                        <item.icon className="size-4 shrink-0" />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold text-[#1d1d1f]">How easy was this page?</legend>
                  <div className="mt-2 flex gap-2" aria-label="Ease rating from 1 to 5">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} type="button" onClick={() => setRating(value)} className={`grid size-10 place-items-center rounded-full border text-sm font-semibold transition ${rating === value ? "border-violet-500 bg-violet-500 text-white" : "border-black/10 bg-white text-[#6e6e73] hover:border-violet-300"}`} aria-label={`${value} out of 5`} aria-pressed={rating === value}>
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="mt-5 grid gap-2 text-sm font-semibold text-[#1d1d1f]">
                  What should we know?
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={10} maxLength={2000} rows={5} placeholder="For example: I clicked Preview and wasn’t sure what to do next…" className="resize-none rounded-xl border border-black/10 bg-[#fbfbfd] px-4 py-3 text-[15px] font-normal leading-6 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
                </label>
                <p className="mt-2 text-xs leading-5 text-[#86868b]">Please don’t include guest names, addresses, payment details, passwords, or security codes.</p>
                {turnstileSiteKey ? <div className="mt-4"><TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} /></div> : null}
                {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
                <button type="submit" disabled={busy || message.trim().length < 10 || (Boolean(turnstileSiteKey) && !turnstileToken)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">
                  <MessageSquareText className="size-4" />
                  {busy ? "Sending…" : "Send feedback"}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
