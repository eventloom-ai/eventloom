import "server-only";

import { generateOriginalSite } from "@/lib/agent/generate-document";
import { env, openaiResponsesOptions } from "@/lib/env";
import { refundBuildCredit } from "@/lib/payments/billing";
import { applyEventDetailsPatch, applySiteOperations, type SiteOperation } from "@/lib/site-document-operations";
import { findSiteNode, type SiteDocument } from "@/lib/site-document";
import {
  appendRunEvent,
  commitStudioRevision,
  createBuilderMessage,
  getStudioRun,
  loadStudioState,
  updateStudioRun,
} from "@/lib/studio-store";
import type { BuilderMessage, EventConfig } from "@/lib/types";

type AgentEdit = {
  message: string;
  summary: string;
  operations: SiteOperation[];
  eventPatch: Partial<EventConfig>;
};

const editSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    message: { type: "string" },
    summary: { type: "string" },
    eventPatch: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: ["string", "null"] }, subtitle: { type: ["string", "null"] }, date: { type: ["string", "null"] },
        venueName: { type: ["string", "null"] }, venueAddress: { type: ["string", "null"] }, rsvpDeadline: { type: ["string", "null"] },
        schedule: { type: ["array", "null"], items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, time: { type: "string" }, location: { type: ["string", "null"] }, description: { type: ["string", "null"] } }, required: ["title", "time", "location", "description"] } },
        rsvpFields: { type: ["array", "null"], items: { type: "string", enum: ["name", "attendance", "party_size", "guest_names", "email", "phone", "meal_preference", "note"] } },
      },
      required: ["title", "subtitle", "date", "venueName", "venueAddress", "rsvpDeadline", "schedule", "rsvpFields"],
    },
    operations: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          op: { type: "string", enum: ["replace_text", "update_style", "set_theme", "remove_node", "move_node", "set_image"] },
          nodeId: { type: ["string", "null"] },
          content: { type: ["string", "null"] },
          url: { type: ["string", "null"] },
          alt: { type: ["string", "null"] },
          beforeNodeId: { type: ["string", "null"] },
          style: {
            type: ["object", "null"], additionalProperties: false,
            properties: {
              background: { type: ["string", "null"] }, color: { type: ["string", "null"] }, accent: { type: ["string", "null"] },
              align: { type: ["string", "null"], enum: ["left", "center", "right", null] }, width: { type: ["string", "null"], enum: ["full", "wide", "content", "narrow", null] },
              padding: { type: ["string", "null"], enum: ["none", "small", "medium", "large", "hero", null] }, gap: { type: ["string", "null"], enum: ["none", "small", "medium", "large", null] },
              radius: { type: ["string", "null"], enum: ["none", "small", "medium", "large", "pill", null] }, columns: { type: ["integer", "null"], enum: [1, 2, 3, 4, null] },
              minHeight: { type: ["string", "null"], enum: ["auto", "screen", "threeQuarter", "half", null] }, font: { type: ["string", "null"], enum: ["display", "body", "mono", null] },
              size: { type: ["string", "null"], enum: ["xs", "sm", "md", "lg", "xl", "hero", null] }, weight: { type: ["string", "null"], enum: ["regular", "medium", "semibold", "bold", null] }, hidden: { type: ["boolean", "null"] },
              texture: { type: ["string", "null"], enum: ["none", "paper", "grain", "linen", "wash", null] }, letterSpacing: { type: ["string", "null"], enum: ["tight", "normal", "wide", "widest", null] },
              italic: { type: ["boolean", "null"] }, opacity: { type: ["string", "null"], enum: ["full", "muted", "faint", null] }, border: { type: ["string", "null"], enum: ["none", "hairline", "thick", null] },
              justify: { type: ["string", "null"], enum: ["start", "center", "end", null] },
              rotate: { type: ["string", "null"], enum: ["none", "left", "right", null] }, offset: { type: ["string", "null"], enum: ["none", "raised", "lowered", null] },
            },
            required: ["background", "color", "accent", "align", "width", "padding", "gap", "radius", "columns", "minHeight", "font", "size", "weight", "hidden", "texture", "letterSpacing", "italic", "opacity", "border", "justify", "rotate", "offset"],
          },
          theme: {
            type: ["object", "null"], additionalProperties: false,
            properties: {
              text: { type: ["string", "null"] }, surface: { type: ["string", "null"] }, accent: { type: ["string", "null"] }, muted: { type: ["string", "null"] },
              display: { type: ["string", "null"], enum: ["editorial", "romantic", "modern", "playful", "bold", "vintage", "elegant", "condensed", null] }, body: { type: ["string", "null"], enum: ["clean", "humanist", "geometric", "serif", "warm", null] },
              radius: { type: ["string", "null"], enum: ["sharp", "soft", "round", null] }, motion: { type: ["string", "null"], enum: ["none", "subtle", "expressive", null] },
            },
            required: ["text", "surface", "accent", "muted", "display", "body", "radius", "motion"],
          },
        },
        required: ["op", "nodeId", "content", "url", "alt", "beforeNodeId", "style", "theme"],
      },
    },
  },
  required: ["message", "summary", "eventPatch", "operations"],
} as const;

export function normalizeModelEdit(raw: Record<string, unknown>): AgentEdit {
  const patch = Object.fromEntries(Object.entries((raw.eventPatch as Record<string, unknown>) ?? {}).filter(([, value]) => typeof value === "string"));
  const rawPatch = (raw.eventPatch as Record<string, unknown>) ?? {};
  if (Array.isArray(rawPatch.schedule)) patch.schedule = rawPatch.schedule.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.title !== "string" || !entry.title.trim() || typeof entry.time !== "string") return [];
    const time = entry.time.trim() || "Time to be announced";
    return [{ title: entry.title, time, ...(typeof entry.location === "string" ? { location: entry.location } : {}), ...(typeof entry.description === "string" ? { description: entry.description } : {}) }];
  });
  if (Array.isArray(rawPatch.rsvpFields)) patch.rsvpFields = rawPatch.rsvpFields.filter((field): field is EventConfig["rsvpFields"][number] => typeof field === "string" && ["name", "attendance", "party_size", "guest_names", "email", "phone", "meal_preference", "note"].includes(field));
  const operations = ((raw.operations as Array<Record<string, unknown>>) ?? []).flatMap((operation) => {
    const op = String(operation.op ?? "");
    const nodeId = typeof operation.nodeId === "string" ? operation.nodeId : "";
    if (op === "replace_text" && nodeId && typeof operation.content === "string") return [{ op, nodeId, content: operation.content } satisfies SiteOperation];
    if (op === "update_style" && nodeId && operation.style && typeof operation.style === "object") {
      const style = Object.fromEntries(Object.entries(operation.style as Record<string, unknown>).filter(([, value]) => value !== undefined));
      return [{ op, nodeId, style } as SiteOperation];
    }
    if (op === "set_image" && nodeId && typeof operation.url === "string") return [{ op, nodeId, url: operation.url, ...(typeof operation.alt === "string" ? { alt: operation.alt } : {}) } satisfies SiteOperation];
    if (op === "remove_node" && nodeId) return [{ op, nodeId } satisfies SiteOperation];
    if (op === "move_node" && nodeId) return [{ op, nodeId, beforeNodeId: typeof operation.beforeNodeId === "string" ? operation.beforeNodeId : null } satisfies SiteOperation];
    if (op === "set_theme" && operation.theme && typeof operation.theme === "object") {
      const theme = operation.theme as Record<string, unknown>;
      const colors = Object.fromEntries(["text", "surface", "accent", "muted"].flatMap((key) => typeof theme[key] === "string" ? [[key, theme[key]]] : []));
      return [{ op, ...(Object.keys(colors).length ? { colors } : {}), ...(typeof theme.display === "string" ? { display: theme.display } : {}), ...(typeof theme.body === "string" ? { body: theme.body } : {}), ...(typeof theme.radius === "string" ? { radius: theme.radius } : {}), ...(typeof theme.motion === "string" ? { motion: theme.motion } : {}) } as SiteOperation];
    }
    return [];
  });
  return { message: String(raw.message ?? "I updated your site."), summary: String(raw.summary ?? "Updated the site"), eventPatch: patch, operations };
}

function fallbackEdit(prompt: string, document: SiteDocument, selectedNodeIds: string[]): AgentEdit {
  const selected = selectedNodeIds.map((id) => findSiteNode(document, id)).find(Boolean);
  const requestedText = prompt.match(/(?:say|read|text(?:\s+to)?|change(?:\s+it)?\s+to)\s+["“]?(.+?)["”]?$/i)?.[1]?.trim();
  if (selected?.type === "text" && requestedText) {
    return { message: `I changed the selected text to “${requestedText}”.`, summary: "Updated selected text", operations: [{ op: "replace_text", nodeId: selected.id, content: requestedText }], eventPatch: {} };
  }
  if (selected && /center/i.test(prompt)) return { message: "I centered the selected element.", summary: "Centered selected element", operations: [{ op: "update_style", nodeId: selected.id, style: { align: "center" } }], eventPatch: {} };
  const palettes: Array<[RegExp, [string, string, string, string]]> = [
    [/blue|navy/i, ["#152238", "#f3f6fb", "#315b8a", "#7c91aa"]], [/pink|blush/i, ["#36252d", "#fff6f8", "#c4788d", "#8c6873"]],
    [/green|forest/i, ["#17281f", "#f5f8f2", "#48745b", "#879486"]], [/gold|luxury/i, ["#241d16", "#fbf7ef", "#b68a43", "#837565"]],
    [/purple|lavender/i, ["#2b2440", "#faf7ff", "#8767b7", "#8b8199"]], [/black|monochrome/i, ["#151515", "#fafafa", "#555555", "#8a8a8a"]],
  ];
  const palette = palettes.find(([pattern]) => pattern.test(prompt))?.[1] ?? [document.theme.colors.text, document.theme.colors.surface, document.theme.colors.accent, document.theme.colors.muted];
  return { message: "I refined the visual direction while keeping your content and structure intact.", summary: "Refined visual direction", operations: [{ op: "set_theme", colors: { text: palette[0], surface: palette[1], accent: palette[2], muted: palette[3] }, motion: /motion|animate/i.test(prompt) ? "expressive" : document.theme.motion }], eventPatch: {} };
}

async function requestAgentEdit(prompt: string, document: SiteDocument, config: EventConfig, messages: BuilderMessage[], selectedNodeIds: string[]) {
  const key = env.openaiApiKey();
  if (!key) return fallbackEdit(prompt, document, selectedNodeIds);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...openaiResponsesOptions(),
      input: [
        { role: "system", content: "You are Eventloom's visual editing agent. Make the smallest safe set of changes that satisfies the request. Preserve all unrelated nodes and event facts. Never invent names, dates, times, venues, addresses, or URLs. Use only node IDs that exist. Prefer updating the selected nodes when selection is present. Return concise user-facing copy." },
        { role: "user", content: JSON.stringify({ request: prompt, selectedNodeIds, event: config, document, recentConversation: messages.slice(-8).map((message) => ({ role: message.role, content: message.content })) }) },
      ],
      text: { format: { type: "json_schema", name: "eventloom_document_edit", strict: true, schema: editSchema } },
    }),
  }).catch(() => null);
  if (!response?.ok) return fallbackEdit(prompt, document, selectedNodeIds);
  const data = await response.json().catch(() => null) as { id?: string; output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  const output = data?.output_text ?? data?.output?.flatMap((item) => item.content ?? []).map((content) => content.text).filter(Boolean).join("\n");
  if (!output) return fallbackEdit(prompt, document, selectedNodeIds);
  try {
    return { edit: normalizeModelEdit(JSON.parse(output) as Record<string, unknown>), responseId: data?.id ?? null };
  } catch {
    return fallbackEdit(prompt, document, selectedNodeIds);
  }
}

export async function executeStudioRun(input: { jobId: string; eventId: string; ownerId: string; prompt: string; selectedNodeIds: string[] }) {
  try {
    const state = await loadStudioState(input.eventId, input.ownerId);
    if (!state) throw new Error("event_not_found");
    const run = await getStudioRun(input.jobId);
    await appendRunEvent(input.jobId, input.eventId, "status", { stage: "analyzing", message: run?.kind === "initial" ? "Designing your site from the brief…" : "Understanding your request…" });
    if (run?.kind === "initial") {
      const original = await generateOriginalSite(input.prompt, state.revision.config);
      const beforeCommit = await getStudioRun(input.jobId);
      if (beforeCommit?.cancel_requested) throw new Error("run_cancelled");
      await appendRunEvent(input.jobId, input.eventId, "status", { stage: "saving", message: original.summary });
      await appendRunEvent(input.jobId, input.eventId, "patch", { document: original.document, config: original.config, changedNodeIds: [], summary: original.summary });
      const committed = await commitStudioRevision({ eventId: input.eventId, ownerId: input.ownerId, baseVersionId: state.revision.id, document: original.document, config: original.config, source: "ai", summary: original.summary, prompt: input.prompt });
      if (!committed.ok) throw new Error(committed.error);
      const assistant = await createBuilderMessage({ eventId: input.eventId, runId: input.jobId, role: "assistant", content: original.message, versionId: committed.revision.id, ownerId: input.ownerId });
      await updateStudioRun(input.jobId, { status: "succeeded", result_version_id: committed.revision.id, progress_step: "done", progress_percent: 100, progress_message: original.summary, completed_at: new Date().toISOString() });
      await appendRunEvent(input.jobId, input.eventId, "committed", { revision: committed.revision, message: assistant, changedNodeIds: [], summary: original.summary });
      return;
    }

    const generated = await requestAgentEdit(input.prompt, state.revision.document, state.revision.config, state.messages, input.selectedNodeIds);
    const edit = "edit" in generated ? generated.edit : generated;
    const responseId = "responseId" in generated ? generated.responseId : null;
    const beforeApply = await getStudioRun(input.jobId);
    if (beforeApply?.cancel_requested) throw new Error("run_cancelled");

    await appendRunEvent(input.jobId, input.eventId, "status", { stage: "applying", message: edit.summary });
    const config = Object.keys(edit.eventPatch).length ? applyEventDetailsPatch(state.revision.config, edit.eventPatch) : state.revision.config;
    const applied = edit.operations.length ? applySiteOperations(state.revision.document, edit.operations) : { document: state.revision.document, changedNodeIds: [] };
    await appendRunEvent(input.jobId, input.eventId, "patch", { document: applied.document, config, changedNodeIds: applied.changedNodeIds, summary: edit.summary });

    const beforeCommit = await getStudioRun(input.jobId);
    if (beforeCommit?.cancel_requested) throw new Error("run_cancelled");
    await appendRunEvent(input.jobId, input.eventId, "status", { stage: "saving", message: "Validating and saving this version…" });
    const committed = await commitStudioRevision({ eventId: input.eventId, ownerId: input.ownerId, baseVersionId: state.revision.id, document: applied.document, config, source: "ai", summary: edit.summary, prompt: input.prompt });
    if (!committed.ok) throw new Error(committed.error);
    const assistant = await createBuilderMessage({ eventId: input.eventId, runId: input.jobId, role: "assistant", content: edit.message, selectedNodeIds: applied.changedNodeIds, versionId: committed.revision.id, ownerId: input.ownerId });
    await updateStudioRun(input.jobId, { status: "succeeded", result_version_id: committed.revision.id, response_id: responseId, progress_step: "done", progress_percent: 100, progress_message: edit.summary, completed_at: new Date().toISOString() });
    await appendRunEvent(input.jobId, input.eventId, "committed", { revision: committed.revision, message: assistant, changedNodeIds: applied.changedNodeIds, summary: edit.summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent_run_failed";
    const cancelled = message === "run_cancelled";
    await updateStudioRun(input.jobId, { status: "failed", error: message, progress_step: "error", progress_message: cancelled ? "Stopped" : "The edit could not be applied.", completed_at: new Date().toISOString() });
    await appendRunEvent(input.jobId, input.eventId, cancelled ? "cancelled" : "error", { message: cancelled ? "Stopped before saving changes." : message });
    await refundBuildCredit(input.ownerId, input.eventId, input.jobId);
  }
}
