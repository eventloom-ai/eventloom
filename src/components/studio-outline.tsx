"use client";

import { GripVertical, MousePointer2, X } from "lucide-react";
import type { DragEvent } from "react";
import type { SiteDocument, SiteNode } from "@/lib/site-document";

type StudioOutlineProps = { document: SiteDocument; selectedNodeId: string | null; onSelect: (id: string) => void; onMove: (nodeId: string, beforeNodeId: string | null) => void; onClose: () => void };

function label(node: SiteNode) { return node.label ?? (node.type === "text" ? node.content ?? node.binding ?? "Text" : node.type); }

export function StudioOutline({ document, selectedNodeId, onSelect, onMove, onClose }: StudioOutlineProps) {
  function drop(event: DragEvent, beforeNodeId: string | null) { event.preventDefault(); const nodeId = event.dataTransfer.getData("text/site-node-id"); if (nodeId && nodeId !== beforeNodeId) onMove(nodeId, beforeNodeId); }
  return <div className="absolute inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-[#171717] text-white shadow-2xl"><div className="flex h-14 items-center justify-between border-b border-white/10 px-4"><p className="text-[12px] font-semibold">Page outline</p><button type="button" onClick={onClose} aria-label="Close outline"><X className="size-4 text-white/50" /></button></div><div className="space-y-1 overflow-y-auto p-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, null)}>{document.nodes.map((node) => <div key={node.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/site-node-id", node.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); drop(event, node.id); }}><button type="button" onClick={() => onSelect(node.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] ${selectedNodeId === node.id ? "bg-violet-400/15 text-violet-100" : "text-white/60 hover:bg-white/[0.05] hover:text-white"}`}><GripVertical className="size-3.5 text-white/25" /><MousePointer2 className="size-3" /><span className="truncate capitalize">{label(node)}</span></button>{"children" in node ? <div className="ml-8 border-l border-white/10 pl-2">{node.children.map((child) => <button key={child.id} type="button" onClick={() => onSelect(child.id)} className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-[10px] capitalize ${selectedNodeId === child.id ? "bg-violet-400/15 text-violet-100" : "text-white/35 hover:text-white"}`}>{label(child)}</button>)}</div> : null}</div>)}</div></div>;
}
