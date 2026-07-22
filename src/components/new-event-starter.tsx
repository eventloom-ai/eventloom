"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeSlugInput, suggestSlug } from "@/lib/slug-suggest";

export function NewEventStarter({ initialBrief = "" }: { initialBrief?: string }) {
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
    const response = await fetch("/api/events/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: value.trim(), slug: selectedSlug }) });
    const payload = await response.json().catch(() => null) as { eventId?: string; error?: string } | null;
    if (response.ok && payload?.eventId) { router.replace(`/app/events/${payload.eventId}/studio`); return; }
    setIsStarting(false); setError(payload?.error === "slug_taken" ? "That link is already in use. Choose another one." : payload?.error ?? "The workspace could not be created.");
  }

  useEffect(() => {
    if (!initialBrief.trim() || automaticallyStarted.current) return;
    automaticallyStarted.current = true;
    void start(initialBrief);
  // Start once from a landing-page brief.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBrief]);

  function submit(event: FormEvent) { event.preventDefault(); void start(prompt); }
  if (isStarting) return <div className="grid min-h-[62vh] place-items-center rounded-3xl border border-white/10 bg-[#151515] text-center text-white"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-300"><Loader2 className="size-5 animate-spin" /></div><p className="mt-5 text-base font-semibold">Opening your studio</p><p className="mt-2 text-sm text-white/40">Your editable first version is taking shape.</p></div></div>;
  return <form onSubmit={submit} className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#171717] p-4 text-white shadow-2xl sm:p-6"><div className="flex items-center gap-2 text-xs font-semibold text-violet-300"><Sparkles className="size-4" /> New event workspace</div><h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">What are you celebrating?</h1><p className="mt-2 text-sm leading-6 text-white/45">Describe the occasion, feeling, and details you already know. You can change everything in the studio.</p><textarea autoFocus value={prompt} onChange={(event) => { setPrompt(event.target.value); if (!slugEdited) setSlug(normalizeSlugInput(suggestSlug(event.target.value) || "")); }} rows={8} maxLength={8000} placeholder="A candlelit garden wedding for Maya and Adam in Toronto next September…" className="mt-6 w-full resize-none rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-violet-400/50" /><label className="mt-4 grid gap-1.5 text-[11px] text-white/45">Site address<div className="flex items-center rounded-xl border border-white/10 bg-[#111] px-3"><span className="text-white/25">eventloom-beta.vercel.app/</span><input value={slug} onChange={(event) => { setSlugEdited(true); setSlug(normalizeSlugInput(event.target.value)); }} className="min-w-0 flex-1 bg-transparent py-2.5 text-white outline-none" /></div></label>{error ? <p className="mt-4 rounded-xl bg-red-400/10 px-3 py-2 text-xs text-red-200" role="alert">{error}</p> : null}<button type="submit" disabled={!prompt.trim() || slug.length < 3} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold transition hover:bg-violet-400 disabled:opacity-35">Create editable site <ArrowRight className="size-4" /></button></form>;
}
