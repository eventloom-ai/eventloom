"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { creatorErrorMessage } from "@/lib/creator-errors";
import { normalizeSlugInput, suggestSlug } from "@/lib/slug-suggest";

export function NewEventStarter({ initialBrief = "", referralJourney = "" }: { initialBrief?: string; referralJourney?: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialBrief);
  const [slug, setSlug] = useState(normalizeSlugInput(suggestSlug(initialBrief) || ""));
  const [slugEdited, setSlugEdited] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const automaticallyStarted = useRef(false);

  async function start(value: string) {
    if (!value.trim() || isStarting) return;
    setIsStarting(true); setError("");
    const selectedSlug = slugEdited ? slug : normalizeSlugInput(suggestSlug(value) || slug || "my-event");
    try {
      const response = await fetch("/api/events/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: value.trim(), slug: selectedSlug, referral_journey: referralJourney || undefined }) });
      const payload = await response.json().catch(() => null) as { eventId?: string; error?: string; warning?: string } | null;
      if (response.ok && payload?.eventId) {
        const notice = payload.warning ? `?notice=${encodeURIComponent(payload.warning)}` : "";
        router.replace(`/app/events/${payload.eventId}/studio${notice}`);
        return;
      }
      setIsStarting(false);
      setError(creatorErrorMessage(payload?.error, "We couldn’t create the workspace. Nothing was charged—please try again."));
    } catch {
      setIsStarting(false);
      setError(creatorErrorMessage("network_error"));
    }
  }

  useEffect(() => {
    if (!initialBrief.trim() || automaticallyStarted.current) return;
    automaticallyStarted.current = true;
    void start(initialBrief);
  // Start once from a landing-page brief.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBrief]);

  function submit(event: FormEvent) { event.preventDefault(); void start(prompt); }
  if (isStarting) {
    return (
      <div className="mx-auto grid min-h-[26rem] max-w-3xl place-items-center rounded-[1.75rem] border border-black/[0.07] bg-white text-center shadow-[0_24px_70px_rgba(38,31,43,0.08)]">
        <div>
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
            <Loader2 className="size-5 animate-spin" />
          </div>
          <p className="mt-5 text-base font-semibold text-[#252329]">Opening your studio</p>
          <p className="mt-2 text-sm text-[#77717a]">Your editable first version is taking shape.</p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-3xl rounded-[1.75rem] border border-black/[0.07] bg-white p-5 shadow-[0_24px_70px_rgba(38,31,43,0.08)] sm:p-8"
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
        <Sparkles className="size-3.5" />
        New event workspace
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#252329] sm:text-3xl">
        What are you celebrating?
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f6a72]">
        Describe the occasion, feeling, and details you already know. You can change everything in the studio.
      </p>

      <label htmlFor="event-description" className="mt-7 block text-sm font-semibold text-[#37323a]">
        Event description
      </label>
      <textarea
        id="event-description"
        autoFocus
        value={prompt}
        onChange={(event) => {
          setPrompt(event.target.value);
          if (!slugEdited) setSlug(normalizeSlugInput(suggestSlug(event.target.value) || ""));
        }}
        rows={7}
        maxLength={8000}
        placeholder="A candlelit garden wedding for Maya and Adam in Toronto next September…"
        className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-[#fbfaf8] px-4 py-3 text-sm leading-6 text-[#252329] outline-none transition placeholder:text-[#aaa5ad] focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />

      <label htmlFor="event-slug" className="mt-5 block text-sm font-semibold text-[#37323a]">
        Site address
      </label>
      <div className="mt-2 flex min-w-0 items-center overflow-hidden rounded-xl border border-black/10 bg-[#fbfaf8] transition focus-within:border-violet-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-100">
        <span className="shrink-0 border-r border-black/[0.07] bg-black/[0.025] px-3 py-3 text-xs text-[#8a858d] sm:text-sm">
          eventloom-beta.vercel.app/
        </span>
        <input
          id="event-slug"
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(normalizeSlugInput(event.target.value));
          }}
          aria-describedby="event-slug-help"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#252329] outline-none"
        />
      </div>
      <p id="event-slug-help" className="mt-2 text-xs text-[#8a858d]">
        This becomes the link you’ll share with guests.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!prompt.trim() || slug.length < 3}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:bg-violet-200 disabled:text-violet-500 disabled:shadow-none"
      >
        Create editable site
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
