"use client";

import { Minus, Plus } from "lucide-react";
import { SiteDocumentRenderer } from "@/components/site-document-renderer";
import type { SiteDocument } from "@/lib/site-document";
import type { EventRecord } from "@/lib/types";

type StudioCanvasProps = {
  document: SiteDocument;
  event: EventRecord;
  selectedNodeId: string | null;
  viewport: "desktop" | "tablet" | "mobile";
  zoom: number;
  changedNodeIds: string[];
  onSelect: (nodeId: string) => void;
  onTextCommit: (nodeId: string, content: string) => void;
  onZoom: (zoom: number) => void;
};

const widths = { desktop: 1440, tablet: 820, mobile: 390 } as const;

export function StudioCanvas({ document, event, selectedNodeId, viewport, zoom, changedNodeIds, onSelect, onTextCommit, onZoom }: StudioCanvasProps) {
  return (
    <section className="relative min-h-0 overflow-auto bg-[#0e0e0e] p-4 sm:p-7" onClick={() => onSelect("")}>
      <div className="pointer-events-none sticky left-1/2 top-0 z-20 mb-3 flex w-fit -translate-x-1/2 items-center gap-2 rounded-lg border border-white/10 bg-[#191919]/95 px-2 py-1 text-[10px] text-white/50 shadow-xl backdrop-blur"><button type="button" className="pointer-events-auto grid size-6 place-items-center hover:text-white" onClick={() => onZoom(Math.max(50, zoom - 10))}><Minus className="size-3" /></button><span className="w-9 text-center tabular-nums">{zoom}%</span><button type="button" className="pointer-events-auto grid size-6 place-items-center hover:text-white" onClick={() => onZoom(Math.min(100, zoom + 10))}><Plus className="size-3" /></button></div>
      <div className="mx-auto origin-top overflow-hidden rounded-lg bg-white shadow-[0_32px_100px_rgba(0,0,0,0.5)] transition-[width,transform] duration-300" style={{ width: widths[viewport], maxWidth: "100%", transform: `scale(${zoom / 100})`, marginBottom: `${-(1 - zoom / 100) * 40}%` }} onClick={(event) => event.stopPropagation()}>
        <SiteDocumentRenderer document={document} config={event.config} eventId={event.id} slug={event.slug} status={event.status} rsvpOpen={event.rsvp_open} selectedNodeId={selectedNodeId} interactive onSelectNode={onSelect} onTextCommit={onTextCommit} />
      </div>
      {changedNodeIds.length ? <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-violet-300/20 bg-violet-500/90 px-4 py-2 text-[11px] font-medium text-white shadow-xl">Updated {changedNodeIds.length} element{changedNodeIds.length === 1 ? "" : "s"}</div> : null}
    </section>
  );
}
