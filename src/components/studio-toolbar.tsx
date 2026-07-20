"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, Code2, Eye, History, Laptop, Redo2, Rocket, Smartphone, Tablet, Undo2 } from "lucide-react";
import Link from "next/link";

type StudioToolbarProps = {
  eventId: string;
  title: string;
  status: string;
  saveStatus: "saved" | "saving" | "error";
  viewport: "desktop" | "tablet" | "mobile";
  canUndo: boolean;
  canRedo: boolean;
  onViewport: (viewport: "desktop" | "tablet" | "mobile") => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleHistory: () => void;
  onToggleCode: () => void;
};

export function StudioToolbar({ eventId, title, status, saveStatus, viewport, canUndo, canRedo, onViewport, onUndo, onRedo, onToggleHistory, onToggleCode }: StudioToolbarProps) {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/publish`, { method: "POST", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => null) as { error?: string; checkout_url?: string } | null;
      if (!response.ok) {
        setPublishError(payload?.error === "publish_failed" ? "Publish failed. Your draft is still safe." : payload?.error ?? "Publish could not start.");
        return;
      }
      if (payload?.checkout_url) {
        window.location.assign(payload.checkout_url);
        return;
      }
      window.location.reload();
    } catch {
      setPublishError("Publish could not start. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#151515] px-3 text-white sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/app" aria-label="Back to my events" className="grid size-8 shrink-0 place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"><ChevronLeft className="size-4" /></Link>
        <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{title}</p><p className="text-[10px] text-white/45">{status} · {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "All changes saved"}</p></div>
      </div>

      <div className="hidden items-center rounded-lg border border-white/10 bg-black/20 p-1 md:flex">
        {(["desktop", "tablet", "mobile"] as const).map((item) => {
          const Icon = item === "desktop" ? Laptop : item === "tablet" ? Tablet : Smartphone;
          return <button key={item} type="button" onClick={() => onViewport(item)} aria-label={`${item} preview`} aria-pressed={viewport === item} className={`grid size-7 place-items-center rounded-md transition ${viewport === item ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}><Icon className="size-3.5" /></button>;
        })}
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className="grid size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-25"><Undo2 className="size-3.5" /></button>
        <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" className="grid size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-25"><Redo2 className="size-3.5" /></button>
        <button type="button" onClick={onToggleHistory} aria-label="Version history" className="hidden size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white sm:grid"><History className="size-3.5" /></button>
        <button type="button" onClick={onToggleCode} aria-label="Inspect generated source" className="hidden size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white sm:grid"><Code2 className="size-3.5" /></button>
        <Link href={`/app/events/${eventId}/preview`} target="_blank" className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/75 hover:bg-white/10 sm:inline-flex"><Eye className="size-3.5" /> Preview</Link>
        <form action={`/api/events/${eventId}/publish`} method="post" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void publish(); }} className="relative">
          <button type="submit" onClick={(event) => { event.preventDefault(); void publish(); }} disabled={publishing} aria-busy={publishing} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-70"><Rocket className="size-3.5" /> {publishing ? "Publishing…" : "Publish"}</button>
          {publishError ? <p role="alert" className="absolute right-0 top-10 z-50 w-64 rounded-lg border border-red-400/30 bg-[#251719] px-3 py-2 text-[11px] leading-4 text-red-100 shadow-xl">{publishError}</p> : null}
        </form>
      </div>
    </header>
  );
}
