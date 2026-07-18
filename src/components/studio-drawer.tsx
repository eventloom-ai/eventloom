"use client";

import { Clock3, Code2, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { SiteDocument, SiteNode } from "@/lib/site-document";
import type { SiteRevision } from "@/lib/types";

type StudioDrawerProps = {
  mode: "history" | "code";
  versions: SiteRevision[];
  document: SiteDocument;
  currentVersionId: string;
  disabled: boolean;
  onRestore: (versionId: string) => void;
  onClose: () => void;
};

function markupNode(node: SiteNode, depth = 1): string {
  const pad = "  ".repeat(depth);
  if ("children" in node) return `${pad}<${node.type === "section" ? "section" : "div"} data-node-id="${node.id}">\n${node.children.map((child) => markupNode(child, depth + 1)).join("\n")}\n${pad}</${node.type === "section" ? "section" : "div"}>`;
  if (node.type === "text") return `${pad}<${node.variant === "heading" ? "h2" : "p"} data-node-id="${node.id}">${node.content ?? `{{ ${node.binding} }}`}</${node.variant === "heading" ? "h2" : "p"}>`;
  if (node.type === "image") return `${pad}<img data-node-id="${node.id}" src="${node.url ?? ""}" alt="${node.alt}" />`;
  if (node.type === "button") return `${pad}<a data-node-id="${node.id}" href="${node.href}">${node.label}</a>`;
  return `${pad}<div data-node-id="${node.id}" data-component="${node.type}"></div>`;
}

function inspectableHtml(document: SiteDocument) { return `<main class="eventloom-site" dir="${document.direction}">\n${document.nodes.map((node) => markupNode(node)).join("\n")}\n</main>`; }
function inspectableCss(document: SiteDocument) { return `:root {\n  --event-text: ${document.theme.colors.text};\n  --event-surface: ${document.theme.colors.surface};\n  --event-accent: ${document.theme.colors.accent};\n  --event-muted: ${document.theme.colors.muted};\n}\n\n/* Layout and component CSS is generated safely by Eventloom's renderer. */`; }

export function StudioDrawer({ mode, versions, document, currentVersionId, disabled, onRestore, onClose }: StudioDrawerProps) {
  const [codeTab, setCodeTab] = useState<"html" | "css">("html");
  return <aside className="absolute inset-y-0 right-0 z-50 flex w-[min(92vw,420px)] flex-col border-l border-white/10 bg-[#171717] text-white shadow-2xl"><div className="flex h-14 items-center justify-between border-b border-white/10 px-4"><div className="flex items-center gap-2 text-[12px] font-semibold">{mode === "history" ? <Clock3 className="size-4 text-violet-300" /> : <Code2 className="size-4 text-violet-300" />}{mode === "history" ? "Version history" : "Generated source"}</div><button type="button" onClick={onClose} aria-label="Close panel" className="grid size-8 place-items-center rounded-lg hover:bg-white/10"><X className="size-4 text-white/50" /></button></div>
    {mode === "history" ? <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{versions.map((version) => <div key={version.id} className={`rounded-xl border p-3 ${version.id === currentVersionId ? "border-violet-400/30 bg-violet-400/[0.08]" : "border-white/10 bg-white/[0.03]"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium">{version.summary || "Saved version"}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-white/30">{version.source} · {new Date(version.created_at).toLocaleString()}</p></div>{version.id !== currentVersionId ? <button type="button" disabled={disabled} onClick={() => onRestore(version.id)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[9px] text-white/55 hover:bg-white/10 disabled:opacity-40"><RotateCcw className="size-3" /> Restore</button> : <span className="rounded-full bg-violet-400/15 px-2 py-1 text-[9px] text-violet-200">Current</span>}</div></div>)}</div> : <div className="flex min-h-0 flex-1 flex-col"><div className="flex gap-1 border-b border-white/10 p-2">{(["html", "css"] as const).map((tab) => <button key={tab} type="button" onClick={() => setCodeTab(tab)} className={`rounded-md px-3 py-1.5 text-[10px] uppercase ${codeTab === tab ? "bg-white/10 text-white" : "text-white/35"}`}>{tab}</button>)}</div><pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[10px] leading-5 text-white/60">{codeTab === "html" ? inspectableHtml(document) : inspectableCss(document)}</pre><p className="border-t border-white/10 p-3 text-[9px] leading-4 text-white/30">Read-only. Eventloom compiles this structured document through the same safe renderer used by the public site.</p></div>}
  </aside>;
}
