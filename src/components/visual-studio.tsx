"use client";

import { Activity, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Layers3, Loader2, MessageSquare, Palette, Square } from "lucide-react";
import { StudioCanvas } from "@/components/studio-canvas";
import { StudioChat } from "@/components/studio-chat";
import { StudioDrawer } from "@/components/studio-drawer";
import { StudioInspector } from "@/components/studio-inspector";
import { StudioOutline } from "@/components/studio-outline";
import { StudioToolbar } from "@/components/studio-toolbar";
import { creatorErrorMessage } from "@/lib/creator-errors";
import { applySiteOperations, type SiteOperation } from "@/lib/site-document-operations";
import { findSiteNode } from "@/lib/site-document";
import type { StudioState } from "@/lib/studio-store";
import type { BuilderMessage, EventConfig, SiteRevision } from "@/lib/types";

type VisualStudioProps = { initialState: StudioState; initialNotice?: string };

export function VisualStudio({ initialState, initialNotice }: VisualStudioProps) {
  const [revision, setRevision] = useState(initialState.revision);
  const [event, setEvent] = useState({ ...initialState.event, config: initialState.revision.config });
  const [versions, setVersions] = useState(initialState.versions);
  const [messages, setMessages] = useState(initialState.messages);
  const [activeRunId, setActiveRunId] = useState(initialState.activeRun?.id ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [zoom, setZoom] = useState(80);
  const [composer, setComposer] = useState("");
  const [activity, setActivity] = useState(initialState.activeRun?.progress_message ?? "");
  const [error, setError] = useState(() => initialNotice ? creatorErrorMessage(initialNotice) : "");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [changedNodeIds, setChangedNodeIds] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState<"chat" | "canvas" | "design">("canvas");
  const [attachment, setAttachment] = useState<{ name: string; url: string } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const selectedNode = useMemo(() => selectedNodeId ? findSiteNode(revision.document, selectedNodeId) : null, [revision.document, selectedNodeId]);
  const selectedLabel = selectedNode ? selectedNode.label ?? selectedNode.type : null;

  const highlight = useCallback((ids: string[]) => {
    setChangedNodeIds(ids);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setChangedNodeIds([]), 3200);
  }, []);

  const applyCommittedRevision = useCallback((next: SiteRevision) => {
    setRevision(next);
    setEvent((current) => ({ ...current, config: next.config, document: next.document, draft_version_id: next.id }));
    setVersions((current) => [next, ...current.filter((version) => version.id !== next.id)]);
    setSaveStatus("saved");
  }, []);

  const refreshState = useCallback(async () => {
    const response = await fetch(`/api/events/${event.id}/studio`, { cache: "no-store" });
    if (!response.ok) return;
    const state = await response.json() as StudioState;
    setRevision(state.revision);
    setEvent({ ...state.event, config: state.revision.config });
    setVersions(state.versions);
    setMessages(state.messages);
    setActiveRunId(state.activeRun?.id ?? null);
  }, [event.id]);

  const connectRun = useCallback((runId: string) => {
    sourceRef.current?.close();
    const source = new EventSource(`/api/events/${event.id}/studio/runs/${runId}/events`);
    sourceRef.current = source;
    source.addEventListener("status", (raw) => { const data = JSON.parse((raw as MessageEvent).data) as { message?: string }; setActivity(data.message ?? "Working on your site…"); });
    source.addEventListener("patch", (raw) => {
      const data = JSON.parse((raw as MessageEvent).data) as { document?: SiteRevision["document"]; config?: EventConfig; changedNodeIds?: string[]; summary?: string };
      if (data.document) setRevision((current) => ({ ...current, document: data.document! }));
      if (data.config) setEvent((current) => ({ ...current, config: data.config! }));
      if (data.changedNodeIds) highlight(data.changedNodeIds);
      if (data.summary) setActivity(data.summary);
    });
    source.addEventListener("committed", (raw) => {
      const data = JSON.parse((raw as MessageEvent).data) as { revision: SiteRevision; message?: BuilderMessage; changedNodeIds?: string[] };
      applyCommittedRevision(data.revision);
      if (data.message) setMessages((current) => [...current.filter((message) => message.id !== data.message?.id), data.message!]);
      highlight(data.changedNodeIds ?? []);
      setActiveRunId(null); setActivity(""); setError(""); source.close();
    });
    const failed = (raw: Event) => {
      if (!(raw instanceof MessageEvent)) return;
      const message = (JSON.parse(raw.data) as { message?: string }).message;
      setError(creatorErrorMessage(message, "We couldn’t apply that change, but your previous version is safe.")); setActiveRunId(null); setActivity(""); source.close(); void refreshState();
    };
    source.addEventListener("error", failed);
    source.addEventListener("cancelled", failed);
  }, [event.id, applyCommittedRevision, highlight, refreshState]);

  useEffect(() => {
    if (activeRunId) connectRun(activeRunId);
    return () => { sourceRef.current?.close(); if (highlightTimer.current) window.clearTimeout(highlightTimer.current); };
  // Connect only the initial run; subsequent runs call connectRun directly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function commitManual(operations: SiteOperation[] | undefined, eventPatch: Partial<EventConfig> | undefined, summary: string) {
    if (activeRunId || saveStatus === "saving") return;
    const base = revision;
    setError(""); setSaveStatus("saving");
    if (operations) {
      try { const optimistic = applySiteOperations(base.document, operations); setRevision((current) => ({ ...current, document: optimistic.document })); highlight(optimistic.changedNodeIds); } catch { setSaveStatus("error"); setError(creatorErrorMessage("invalid_edit")); return; }
    }
    if (eventPatch) setEvent((current) => ({ ...current, config: { ...current.config, ...eventPatch } }));
    const response = await fetch(`/api/events/${event.id}/studio`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseVersionId: base.id, operations, eventPatch, summary }) });
    const payload = await response.json().catch(() => null) as { revision?: SiteRevision; error?: string; state?: StudioState; changedNodeIds?: string[] } | null;
    if (!response.ok || !payload?.revision) {
      setSaveStatus("error"); setError(creatorErrorMessage(payload?.error, "We couldn’t save that edit, but your previous version is safe."));
      if (payload?.state) { setRevision(payload.state.revision); setVersions(payload.state.versions); setEvent({ ...payload.state.event, config: payload.state.revision.config }); } else { setRevision(base); setEvent((current) => ({ ...current, config: base.config })); }
      return;
    }
    applyCommittedRevision(payload.revision); highlight(payload.changedNodeIds ?? []); setRedoStack([]);
  }

  async function sendMessage() {
    const value = composer.trim(); if (!value || activeRunId) return;
    const prompt = attachment ? `${value}\n\nReference image URL: ${attachment.url}` : value;
    setError("");
    const optimistic: BuilderMessage = { id: `pending-${crypto.randomUUID()}`, event_id: event.id, run_id: null, role: "user", content: prompt, selected_node_ids: selectedNodeId ? [selectedNodeId] : [], version_id: revision.id, status: "pending", created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    const response = await fetch(`/api/events/${event.id}/studio/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt, baseVersionId: revision.id, selectedNodeIds: selectedNodeId ? [selectedNodeId] : [] }) });
    const payload = await response.json().catch(() => null) as { runId?: string; message?: BuilderMessage; error?: string; state?: StudioState } | null;
    if (!response.ok || !payload?.runId) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setError(creatorErrorMessage(payload?.error, "We couldn’t start that change. Your message and draft are safe."));
      if (payload?.state) { setRevision(payload.state.revision); setVersions(payload.state.versions); }
      return;
    }
    setComposer(""); setAttachment(null); setMessages((current) => [...current.filter((message) => message.id !== optimistic.id), payload.message ?? optimistic]); setActiveRunId(payload.runId); setActivity("Understanding your request…"); connectRun(payload.runId);
  }

  async function uploadAttachment(file: File) {
    setUploadingAttachment(true); setError("");
    const form = new FormData(); form.set("image", file);
    const response = await fetch(`/api/events/${event.id}/assets`, { method: "POST", body: form });
    const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null;
    setUploadingAttachment(false);
    if (!response.ok || !payload?.url) { setError(creatorErrorMessage(payload?.error, "We couldn’t upload that reference image.")); return; }
    setAttachment({ name: file.name, url: payload.url });
    if (!composer.trim()) setComposer("Use this image as a visual reference for the site.");
  }

  async function stopRun() { if (!activeRunId) return; await fetch(`/api/events/${event.id}/studio/runs/${activeRunId}/cancel`, { method: "POST" }); setActivity("Stopping after the current step…"); }
  async function restore(versionId: string, pushRedo = true) {
    if (activeRunId || saveStatus === "saving") return;
    const previous = revision.id; setSaveStatus("saving");
    const response = await fetch(`/api/events/${event.id}/studio/versions/${versionId}/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseVersionId: revision.id }) });
    const payload = await response.json().catch(() => null) as { revision?: SiteRevision; error?: string } | null;
    if (response.ok && payload?.revision) { if (pushRedo) setRedoStack((current) => [previous, ...current]); applyCommittedRevision(payload.revision); setDrawerOpen(false); } else { setSaveStatus("error"); setError(creatorErrorMessage(payload?.error, "We couldn’t restore that version. Your current version is unchanged.")); }
  }
  const canUndo = Boolean(revision.parent_version_id && versions.some((version) => version.id === revision.parent_version_id));
  async function undo() { if (revision.parent_version_id) await restore(revision.parent_version_id); }
  async function redo() { const target = redoStack[0]; if (!target) return; setRedoStack((current) => current.slice(1)); await restore(target, false); }

  return <main className="flex h-[100svh] min-h-[680px] flex-col overflow-hidden bg-[#111]">
    <StudioToolbar eventId={event.id} title={event.config.title} status={event.status} saveStatus={saveStatus} viewport={viewport} canUndo={canUndo} canRedo={redoStack.length > 0} onViewport={setViewport} onUndo={undo} onRedo={redo} onToggleHistory={() => setDrawerOpen((current) => !current)} />
    <div className="relative min-h-0 flex-1">
      <div className="hidden h-full min-h-0 grid-cols-[320px_minmax(0,1fr)_300px] grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid">
        <StudioChat messages={messages} value={composer} selectedLabel={selectedLabel} isRunning={Boolean(activeRunId)} activity={activity} error={error} onChange={setComposer} onSubmit={sendMessage} onStop={stopRun} onClearSelection={() => setSelectedNodeId(null)} onAttachment={uploadAttachment} attachmentName={attachment?.name} uploadingAttachment={uploadingAttachment} />
        <div className="relative min-h-0 min-w-0 overflow-hidden"><button type="button" onClick={() => setOutlineOpen(true)} className="absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#191919] px-2.5 py-1.5 text-[10px] text-white/55 shadow-lg hover:text-white"><Layers3 className="size-3.5" /> Sections</button><StudioCanvas document={revision.document} event={event} selectedNodeId={selectedNodeId} viewport={viewport} zoom={zoom} changedNodeIds={changedNodeIds} onSelect={(id) => setSelectedNodeId(id || null)} onTextCommit={(nodeId, content) => commitManual([{ op: "replace_text", nodeId, content }], undefined, "Edited text on page preview")} onZoom={setZoom} /></div>
        <StudioInspector eventId={event.id} node={selectedNode} config={event.config} disabled={Boolean(activeRunId) || saveStatus === "saving"} onOperations={(operations, summary) => commitManual(operations, undefined, summary)} onEventPatch={(patch, summary) => commitManual(undefined, patch, summary)} />
      </div>
      <div className="flex h-full flex-col lg:hidden">
        <div className="min-h-0 flex-1">
          <Activity mode={mobileTab === "chat" ? "visible" : "hidden"}><div className="h-full"><StudioChat messages={messages} value={composer} selectedLabel={selectedLabel} isRunning={Boolean(activeRunId)} activity={activity} error={error} onChange={setComposer} onSubmit={sendMessage} onStop={stopRun} onClearSelection={() => setSelectedNodeId(null)} onAttachment={uploadAttachment} attachmentName={attachment?.name} uploadingAttachment={uploadingAttachment} hideComposer /></div></Activity>
          <Activity mode={mobileTab === "canvas" ? "visible" : "hidden"}><div className="h-full"><StudioCanvas document={revision.document} event={event} selectedNodeId={selectedNodeId} viewport="mobile" zoom={100} changedNodeIds={changedNodeIds} onSelect={(id) => setSelectedNodeId(id || null)} onTextCommit={(nodeId, content) => commitManual([{ op: "replace_text", nodeId, content }], undefined, "Edited text on canvas")} onZoom={() => undefined} /></div></Activity>
          <Activity mode={mobileTab === "design" ? "visible" : "hidden"}><div className="h-full"><StudioInspector eventId={event.id} node={selectedNode} config={event.config} disabled={Boolean(activeRunId) || saveStatus === "saving"} onOperations={(operations, summary) => commitManual(operations, undefined, summary)} onEventPatch={(patch, summary) => commitManual(undefined, patch, summary)} /></div></Activity>
        </div>
        <form onSubmit={(formEvent) => { formEvent.preventDefault(); void sendMessage(); }} className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-[#171717] px-2.5 py-2 text-white"><label className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/10 text-white/45" aria-label="Add reference image">{uploadingAttachment ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={Boolean(activeRunId) || uploadingAttachment} onChange={(inputEvent) => { const file = inputEvent.target.files?.[0]; inputEvent.target.value = ""; if (file) void uploadAttachment(file); }} className="hidden" /></label><input value={composer} onChange={(inputEvent) => setComposer(inputEvent.target.value)} placeholder={attachment ? `Attached: ${attachment.name}` : "Describe a change…"} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#222] px-3 py-2.5 text-[12px] outline-none placeholder:text-white/30 focus:border-violet-400/50" />{activeRunId ? <button type="button" onClick={stopRun} className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-black" aria-label="Stop agent"><Square className="size-3.5 fill-current" /></button> : <button type="submit" disabled={!composer.trim() || uploadingAttachment} className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500 disabled:opacity-35" aria-label="Send"><ArrowUp className="size-4" /></button>}</form>
        <nav className="grid h-12 shrink-0 grid-cols-3 border-t border-white/10 bg-[#171717] text-white">{([{ id: "chat", label: "Ask", icon: MessageSquare }, { id: "canvas", label: "Preview", icon: Layers3 }, { id: "design", label: "Design", icon: Palette }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setMobileTab(id)} className={`grid place-items-center text-[9px] ${mobileTab === id ? "text-violet-300" : "text-white/35"}`}><span className="grid place-items-center gap-0.5"><Icon className="size-4" />{label}</span></button>)}</nav>
      </div>
      {outlineOpen ? <StudioOutline document={revision.document} selectedNodeId={selectedNodeId} onSelect={(id) => { setSelectedNodeId(id); setOutlineOpen(false); }} onMove={(nodeId, beforeNodeId) => commitManual([{ op: "move_node", nodeId, beforeNodeId }], undefined, "Reordered sections")} onClose={() => setOutlineOpen(false)} /> : null}
      {drawerOpen ? <StudioDrawer versions={versions} currentVersionId={revision.id} disabled={Boolean(activeRunId)} onRestore={restore} onClose={() => setDrawerOpen(false)} /> : null}
    </div>
  </main>;
}
