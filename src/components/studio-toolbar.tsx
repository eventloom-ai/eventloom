"use client";

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
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#151515] px-3 text-white sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link href={`/app/events/${eventId}`} aria-label="Back to event" className="grid size-8 shrink-0 place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"><ChevronLeft className="size-4" /></Link>
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
        <form action={`/api/events/${eventId}/publish`} method="post"><button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-violet-400"><Rocket className="size-3.5" /> Publish</button></form>
      </div>
    </header>
  );
}
