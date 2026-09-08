"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Puck, type Data, type Viewports } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { createEventloomPuckConfig } from "@/components/eventloom-puck-config";
import { StudioChat } from "@/components/studio-chat";
import { StudioDrawer } from "@/components/studio-drawer";
import { StudioToolbar } from "@/components/studio-toolbar";
import { creatorErrorMessage } from "@/lib/creator-errors";
import { puckDataToEventPatch, puckDataToSiteDocument, selectedPuckNodeId, siteDocumentToPuckData } from "@/lib/puck-document";
import type { StudioState } from "@/lib/studio-store";
import type { BuilderMessage, EventConfig, SiteRevision } from "@/lib/types";

type VisualStudioProps = { initialState: StudioState; initialNotice?: string };

const studioViewports: Viewports = [
  { width: 390, height: "auto", icon: "Smartphone", label: "Phone" },
  { width: 820, height: "auto", icon: "Tablet", label: "Tablet" },
  { width: 1440, height: "auto", icon: "Monitor", label: "Desktop" },
  { width: "100%", height: "auto", label: "Fill" },
];

const studioDictionary = { "header-publish": "Save draft" } as const;

export function VisualStudio({ initialState, initialNotice }: VisualStudioProps) {
  const [revision, setRevision] = useState(initialState.revision);
  const [event, setEvent] = useState({ ...initialState.event, config: initialState.revision.config });
  const [versions, setVersions] = useState(initialState.versions);
  const [messages, setMessages] = useState(initialState.messages);
  const [activeRunId, setActiveRunId] = useState(initialState.activeRun?.id ?? null);
  const [composer, setComposer] = useState("");
  const [activity, setActivity] = useState(initialState.activeRun?.progress_message ?? "");
  const [error, setError] = useState(() => initialNotice ? creatorErrorMessage(initialNotice) : "");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; url: string } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [editorData, setEditorData] = useState<Data>(() => siteDocumentToPuckData(initialState.revision.document, initialState.revision.config));
  const [editorKey, setEditorKey] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const baseVersionIdRef = useRef(initialState.revision.id);
  const queuedEditRef = useRef<{ document: SiteRevision["document"]; eventPatch: Partial<EventConfig> } | null>(null);
  const activeSaveRef = useRef<Promise<void> | null>(null);

  const puckConfig = useMemo(() => createEventloomPuckConfig({
    document: revision.document,
    config: event.config,
    status: event.status,
    rsvpOpen: false,
  // Puck treats a new config identity as a new editing session. Live event data
  // is supplied through metadata, so autosaves must not rebuild this config.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const puckMetadata = useMemo(() => ({ config: event.config }), [event.config]);

  const applyCommittedRevision = useCallback((next: SiteRevision, updateEditor = false) => {
    baseVersionIdRef.current = next.id;
    setRevision(next);
    setEvent((current) => {
      const config = JSON.stringify(current.config) === JSON.stringify(next.config) ? current.config : next.config;
      return { ...current, config, document: next.document, draft_version_id: next.id };
    });
    setVersions((current) => [next, ...current.filter((version) => version.id !== next.id)]);
    setSaveStatus("saved");
    if (updateEditor) {
      setEditorData(siteDocumentToPuckData(next.document, next.config));
      setEditorKey((current) => current + 1);
    }
  }, []);

  const refreshState = useCallback(async () => {
    const response = await fetch(`/api/events/${event.id}/studio`, { cache: "no-store" });
    if (!response.ok) return;
    const state = await response.json() as StudioState;
    applyCommittedRevision(state.revision, true);
    setVersions(state.versions);
    setMessages(state.messages);
    setActiveRunId(state.activeRun?.id ?? null);
  }, [applyCommittedRevision, event.id]);

  const persistQueuedDocuments = useCallback(async () => {
    while (activeSaveRef.current) await activeSaveRef.current;
    if (!queuedEditRef.current) return;
    const run = (async () => {
      while (queuedEditRef.current) {
        const edit = queuedEditRef.current;
        queuedEditRef.current = null;
        setSaveStatus("saving");
        setError("");
        const response = await fetch(`/api/events/${event.id}/studio`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseVersionId: baseVersionIdRef.current, document: edit.document, eventPatch: edit.eventPatch, summary: "Edited in the visual studio" }),
        });
        const payload = await response.json().catch(() => null) as { revision?: SiteRevision; error?: string; state?: StudioState } | null;
        if (!response.ok || !payload?.revision) {
          setSaveStatus("error");
          setError(creatorErrorMessage(payload?.error, "We couldn’t save that edit. Your previous version is safe."));
          if (payload?.state) applyCommittedRevision(payload.state.revision, true);
          queuedEditRef.current = null;
          break;
        }
        applyCommittedRevision(payload.revision);
      }
    })();
    activeSaveRef.current = run;
    try {
      await run;
    } finally {
      activeSaveRef.current = null;
    }
  }, [applyCommittedRevision, event.id]);

  const queueSave = useCallback((data: Data, immediate = false) => {
    try {
      const eventPatch = puckDataToEventPatch(data);
      setEditorData(data);
      queuedEditRef.current = { document: puckDataToSiteDocument(data), eventPatch };
      if (Object.keys(eventPatch).length) {
        setEvent((current) => {
          const nextConfig = { ...current.config, ...eventPatch };
          return JSON.stringify(nextConfig) === JSON.stringify(current.config)
            ? current
            : { ...current, config: nextConfig };
        });
      }
      setSaveStatus("saving");
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (immediate) void persistQueuedDocuments();
      else saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void persistQueuedDocuments();
      }, 700);
    } catch (saveError) {
      setSaveStatus("error");
      setError(creatorErrorMessage(saveError instanceof Error ? saveError.message : "invalid_edit"));
    }
  }, [persistQueuedDocuments]);

  const handlePuckChange = useCallback((data: Data) => queueSave(data), [queueSave]);
  const handlePuckPublish = useCallback((data: Data) => queueSave(data, true), [queueSave]);
  const handlePuckAction = useCallback((_action: unknown, state: { data: Data; ui: { itemSelector: Parameters<typeof selectedPuckNodeId>[1] } }) => {
    setSelectedNodeId(selectedPuckNodeId(state.data, state.ui.itemSelector));
  }, []);

  const connectRun = useCallback((runId: string) => {
    sourceRef.current?.close();
    const source = new EventSource(`/api/events/${event.id}/studio/runs/${runId}/events`);
    sourceRef.current = source;
    source.addEventListener("status", (raw) => {
      const data = JSON.parse((raw as MessageEvent).data) as { message?: string };
      setActivity(data.message ?? "Working on your site…");
    });
    source.addEventListener("patch", (raw) => {
      const data = JSON.parse((raw as MessageEvent).data) as { document?: SiteRevision["document"]; config?: EventConfig; summary?: string };
      if (data.document) setEditorData(siteDocumentToPuckData(data.document, data.config ?? event.config));
      if (data.config) setEvent((current) => ({ ...current, config: data.config! }));
      if (data.summary) setActivity(data.summary);
    });
    source.addEventListener("committed", (raw) => {
      const data = JSON.parse((raw as MessageEvent).data) as { revision: SiteRevision; message?: BuilderMessage };
      applyCommittedRevision(data.revision, true);
      if (data.message) setMessages((current) => [...current.filter((message) => message.id !== data.message?.id), data.message!]);
      setActiveRunId(null);
      setActivity("");
      setError("");
      source.close();
    });
    const failed = (raw: Event) => {
      if (!(raw instanceof MessageEvent)) return;
      const message = (JSON.parse(raw.data) as { message?: string }).message;
      setError(creatorErrorMessage(message, "We couldn’t apply that change, but your previous version is safe."));
      setActiveRunId(null);
      setActivity("");
      source.close();
      void refreshState();
    };
    source.addEventListener("error", failed);
    source.addEventListener("cancelled", failed);
  }, [applyCommittedRevision, event.config, event.id, refreshState]);

  useEffect(() => {
    if (activeRunId) connectRun(activeRunId);
    return () => {
      sourceRef.current?.close();
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  // Connect only the run that existed when the page loaded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage() {
    const value = composer.trim();
    if (!value || activeRunId) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    await persistQueuedDocuments();
    const prompt = attachment ? `${value}\n\nReference image URL: ${attachment.url}` : value;
    setError("");
    const optimistic: BuilderMessage = { id: `pending-${crypto.randomUUID()}`, event_id: event.id, run_id: null, role: "user", content: prompt, selected_node_ids: selectedNodeId ? [selectedNodeId] : [], version_id: baseVersionIdRef.current, status: "pending", created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    const response = await fetch(`/api/events/${event.id}/studio/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt, baseVersionId: baseVersionIdRef.current, selectedNodeIds: selectedNodeId ? [selectedNodeId] : [] }) });
    const payload = await response.json().catch(() => null) as { runId?: string; message?: BuilderMessage; error?: string; state?: StudioState } | null;
    if (!response.ok || !payload?.runId) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setError(creatorErrorMessage(payload?.error, "We couldn’t start that change. Your message and draft are safe."));
      if (payload?.state) applyCommittedRevision(payload.state.revision, true);
      return;
    }
    setComposer("");
    setAttachment(null);
    setMessages((current) => [...current.filter((message) => message.id !== optimistic.id), payload.message ?? optimistic]);
    setActiveRunId(payload.runId);
    setActivity("Understanding your request…");
    connectRun(payload.runId);
  }

  async function uploadAttachment(file: File) {
    setUploadingAttachment(true);
    setError("");
    const form = new FormData();
    form.set("image", file);
    const response = await fetch(`/api/events/${event.id}/assets`, { method: "POST", body: form });
    const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null;
    setUploadingAttachment(false);
    if (!response.ok || !payload?.url) {
      setError(creatorErrorMessage(payload?.error, "We couldn’t upload that reference image."));
      return;
    }
    setAttachment({ name: file.name, url: payload.url });
    if (!composer.trim()) setComposer("Use this image as a visual reference for the site.");
  }

  async function stopRun() {
    if (!activeRunId) return;
    await fetch(`/api/events/${event.id}/studio/runs/${activeRunId}/cancel`, { method: "POST" });
    setActivity("Stopping after the current step…");
  }

  async function restore(versionId: string) {
    if (activeRunId || saveStatus === "saving") return;
    setSaveStatus("saving");
    const response = await fetch(`/api/events/${event.id}/studio/versions/${versionId}/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseVersionId: baseVersionIdRef.current }) });
    const payload = await response.json().catch(() => null) as { revision?: SiteRevision; error?: string } | null;
    if (response.ok && payload?.revision) {
      applyCommittedRevision(payload.revision, true);
      setDrawerOpen(false);
    } else {
      setSaveStatus("error");
      setError(creatorErrorMessage(payload?.error, "We couldn’t restore that version. Your current version is unchanged."));
    }
  }

  return <main className="eventloom-studio flex h-[100svh] min-h-[680px] flex-col overflow-hidden bg-[#111]">
    <StudioToolbar eventId={event.id} title={event.config.title} status={event.status} saveStatus={saveStatus} viewport="desktop" canUndo={false} canRedo={false} onViewport={() => undefined} onUndo={() => undefined} onRedo={() => undefined} onToggleHistory={() => setDrawerOpen((current) => !current)} showEditingControls={false} />
    <div className="relative flex min-h-0 flex-1">
       {chatOpen ? <div className="absolute inset-y-0 left-0 z-50 w-[min(92vw,340px)] shadow-2xl">
         <button type="button" onClick={() => setChatOpen(false)} aria-label="Close AI assistant" className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-md text-white/45 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
         <StudioChat messages={messages} value={composer} selectedLabel={selectedNodeId ? "selected page element" : null} isRunning={Boolean(activeRunId)} activity={activity} error={error} onChange={setComposer} onSubmit={sendMessage} onStop={stopRun} onClearSelection={() => setSelectedNodeId(null)} onAttachment={uploadAttachment} attachmentName={attachment?.name} uploadingAttachment={uploadingAttachment} />
       </div> : <button type="button" onClick={() => setChatOpen(true)} className="absolute bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-[#155166] px-4 py-2.5 text-xs font-semibold text-white shadow-xl"><MessageSquare className="size-4" /> Ask Eventloom</button>}
      <div className="min-w-0 flex-1 bg-[#f3f3f3]">
        <Puck
          key={editorKey}
          config={puckConfig}
          data={editorData}
          metadata={puckMetadata}
          height="100%"
          onChange={handlePuckChange}
          onPublish={handlePuckPublish}
          onAction={handlePuckAction}
          headerTitle={event.config.title}
          dictionary={studioDictionary}
          viewports={studioViewports}
        />
      </div>
      {drawerOpen ? <StudioDrawer versions={versions} currentVersionId={revision.id} disabled={Boolean(activeRunId) || saveStatus === "saving"} onRestore={restore} onClose={() => setDrawerOpen(false)} /> : null}
    </div>
  </main>;
}
