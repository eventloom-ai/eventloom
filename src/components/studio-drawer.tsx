"use client";

import { Clock3, RotateCcw, X } from "lucide-react";
import type { SiteRevision } from "@/lib/types";

type StudioDrawerProps = {
  versions: SiteRevision[];
  currentVersionId: string;
  disabled: boolean;
  onRestore: (versionId: string) => void;
  onClose: () => void;
};

export function StudioDrawer({ versions, currentVersionId, disabled, onRestore, onClose }: StudioDrawerProps) {
  return <aside className="absolute inset-y-0 right-0 z-50 flex w-[min(92vw,420px)] flex-col border-l border-white/10 bg-[#171717] text-white shadow-2xl"><div className="flex h-14 items-center justify-between border-b border-white/10 px-4"><div className="flex items-center gap-2 text-[12px] font-semibold"><Clock3 className="size-4 text-violet-300" />Version history</div><button type="button" onClick={onClose} aria-label="Close version history" className="grid size-8 place-items-center rounded-lg hover:bg-white/10"><X className="size-4 text-white/50" /></button></div>
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{versions.map((version) => <div key={version.id} className={`rounded-xl border p-3 ${version.id === currentVersionId ? "border-violet-400/30 bg-violet-400/[0.08]" : "border-white/10 bg-white/[0.03]"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium">{version.summary || "Saved version"}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-white/30">{version.source} · {new Date(version.created_at).toLocaleString()}</p></div>{version.id !== currentVersionId ? <button type="button" disabled={disabled} onClick={() => onRestore(version.id)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[9px] text-white/55 hover:bg-white/10 disabled:opacity-40"><RotateCcw className="size-3" /> Restore</button> : <span className="rounded-full bg-violet-400/15 px-2 py-1 text-[9px] text-violet-200">Current</span>}</div></div>)}</div>
  </aside>;
}
