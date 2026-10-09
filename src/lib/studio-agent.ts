import "server-only";

import { generateOriginalSite } from "@/lib/agent/generate-document";
import { aiCallTimeoutMs } from "@/lib/ai/deadline";
import { CONTENT_KEYS, applyDesignPatch, designPatchSchema, fallbackDesignPatch, sectionsTouchedBy, type DesignPatch } from "@/lib/event-design/design-patch";
import { SECTION_KEYS, SECTION_VARIANTS, readEventDesign, type EventDesign, type SectionKey } from "@/lib/event-design/schema";
import { DESIGN_STYLES, STYLE_KEYS } from "@/lib/event-design/styles";
import { env, openaiResponsesOptions } from "@/lib/env";
import { sectionKindFromPuckId, sectionPuckId } from "@/lib/puck-design";
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

const styleKeys = ["background", "color", "accent", "align", "width", "padding", "gap", "radius", "columns", "minHeight", "font", "size", "weight", "hidden", "texture", "letterSpacing", "italic", "opacity", "border", "justify", "rotate", "offset"];

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
          removeStyleKeys: { type: ["array", "null"], items: { type: "string", enum: styleKeys } },
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
            required: styleKeys,
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
        required: ["op", "nodeId", "content", "url", "alt", "beforeNodeId", "removeStyleKeys", "style", "theme"],
      },
    },
  },
  required: ["message", "summary", "eventPatch", "operations"],
} as const;

/** The event-details half of a model edit: strings, schedule and RSVP fields; null means unchanged. */
function normalizeEventPatch(rawPatch: Record<string, unknown>): Partial<EventConfig> {
  const patch: Record<string, unknown> = Object.fromEntries(Object.entries(rawPatch).filter(([, value]) => typeof value === "string"));
  if (Array.isArray(rawPatch.schedule)) patch.schedule = rawPatch.schedule.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.title !== "string" || !entry.title.trim() || typeof entry.time !== "string") return [];
    const time = entry.time.trim() || "Time to be announced";
    return [{ title: entry.title, time, ...(typeof entry.location === "string" ? { location: entry.location } : {}), ...(typeof entry.description === "string" ? { description: entry.description } : {}) }];
  });
  if (Array.isArray(rawPatch.rsvpFields)) patch.rsvpFields = rawPatch.rsvpFields.filter((field): field is EventConfig["rsvpFields"][number] => typeof field === "string" && ["name", "attendance", "party_size", "guest_names", "email", "phone", "meal_preference", "note"].includes(field));
  return patch as Partial<EventConfig>;
}

export function normalizeModelEdit(raw: Record<string, unknown>): AgentEdit {
  const patch = normalizeEventPatch((raw.eventPatch as Record<string, unknown>) ?? {});
  const operations = ((raw.operations as Array<Record<string, unknown>>) ?? []).flatMap((operation) => {
    const op = String(operation.op ?? "");
    const nodeId = typeof operation.nodeId === "string" ? operation.nodeId : "";
    if (op === "replace_text" && nodeId && typeof operation.content === "string") return [{ op, nodeId, content: operation.content } satisfies SiteOperation];
    if (op === "update_style" && nodeId) {
      // The strict schema makes the model send every style key, so null means "unchanged"; removals must be explicit.
      const style: Record<string, unknown> = Object.fromEntries(Object.entries(operation.style && typeof operation.style === "object" ? operation.style as Record<string, unknown> : {}).filter(([key, value]) => styleKeys.includes(key) && value !== undefined && value !== null));
      if (Array.isArray(operation.removeStyleKeys)) for (const key of operation.removeStyleKeys) if (typeof key === "string" && styleKeys.includes(key) && !(key in style)) style[key] = null;
      return Object.keys(style).length ? [{ op, nodeId, style } as SiteOperation] : [];
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

async function requestAgentEdit(prompt: string, document: SiteDocument, config: EventConfig, messages: BuilderMessage[], selectedNodeIds: string[], deadline?: number) {
  const key = env.openaiApiKey();
  const timeoutMs = aiCallTimeoutMs(deadline);
  if (!key || timeoutMs === null) return fallbackEdit(prompt, document, selectedNodeIds);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...openaiResponsesOptions("studio-edit"),
      input: [
        { role: "system", content: "You are Eventloom's visual editing agent. Make the smallest safe set of changes that satisfies the request. Preserve all unrelated nodes and event facts. Never invent names, dates, times, venues, addresses, or URLs. Use only node IDs that exist. Prefer updating the selected nodes when selection is present. In update_style, set every style key you are not changing to null; to clear an existing style value, list its key in removeStyleKeys. Return concise user-facing copy." },
        { role: "user", content: JSON.stringify({ request: prompt, selectedNodeIds, event: config, document, recentConversation: messages.slice(-8).map((message) => ({ role: message.role, content: message.content })) }) },
      ],
      text: { format: { type: "json_schema", name: "eventloom_document_edit", strict: true, schema: editSchema } },
    }),
    signal: AbortSignal.timeout(timeoutMs),
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

/* Designed events: the assistant edits the design (style, palette, copy, sections), never raw layout ---------------- */

type DesignAgentEdit = { message: string; summary: string; eventPatch: Partial<EventConfig>; designPatch: DesignPatch };

const nullableText = { type: ["string", "null"] } as const;
const sectionEnum = { type: "string", enum: [...SECTION_KEYS] } as const;
const designEditSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    message: { type: "string" },
    summary: { type: "string" },
    eventPatch: editSchema.properties.eventPatch,
    design: {
      type: "object",
      additionalProperties: false,
      properties: {
        styleKey: { type: ["string", "null"], enum: [...STYLE_KEYS, null] },
        paletteKey: { type: ["string", "null"], enum: [...STYLE_KEYS.flatMap((key) => DESIGN_STYLES[key].palettes.map((palette) => palette.key)), null] },
        content: {
          type: "object",
          additionalProperties: false,
          properties: {
            eyebrow: nullableText, detailsHeading: nullableText, scheduleHeading: nullableText, galleryHeading: nullableText, goodToKnowHeading: nullableText,
            rsvpHeading: nullableText, rsvpDescription: nullableText, closingLine: nullableText, dressCode: nullableText,
            story: { type: ["object", "null"], additionalProperties: false, properties: { eyebrow: nullableText, heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } }, signature: nullableText }, required: ["eyebrow", "heading", "paragraphs", "signature"] },
            goodToKnow: { type: ["array", "null"], items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] } },
            travel: { type: ["array", "null"], items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, body: { type: "string" }, href: nullableText, linkLabel: nullableText }, required: ["title", "body", "href", "linkLabel"] } },
          },
          required: ["eyebrow", "detailsHeading", "scheduleHeading", "galleryHeading", "goodToKnowHeading", "rsvpHeading", "rsvpDescription", "closingLine", "dressCode", "story", "goodToKnow", "travel"],
        },
        clearContent: { type: "array", items: { type: "string", enum: [...CONTENT_KEYS] } },
        hide: { type: "array", items: sectionEnum },
        show: { type: "array", items: sectionEnum },
        order: { type: ["array", "null"], items: sectionEnum },
        variants: {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(SECTION_KEYS.map((key) => [key, { type: ["string", "null"], enum: [...SECTION_VARIANTS[key], null] }])),
          required: [...SECTION_KEYS],
        },
      },
      required: ["styleKey", "paletteKey", "content", "clearContent", "hide", "show", "order", "variants"],
    },
  },
  required: ["message", "summary", "eventPatch", "design"],
} as const;

const textValue = (value: unknown, max: number) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** Model output → a valid design patch. Copy whose numbers (dates, times, counts) are not in the facts is dropped. */
export function normalizeDesignEdit(raw: Record<string, unknown>, facts: string): DesignAgentEdit {
  const design = (raw.design as Record<string, unknown>) ?? {};
  const grounded = (value: unknown, max: number) => {
    const text = textValue(value, max);
    return text && (text.match(/\d+/g) ?? []).every((number) => facts.includes(number)) ? text : undefined;
  };
  const rawContent = (design.content as Record<string, unknown>) ?? {};
  const content: Record<string, unknown> = {};
  for (const key of ["eyebrow", "detailsHeading", "scheduleHeading", "galleryHeading", "goodToKnowHeading", "rsvpHeading", "closingLine"] as const) {
    const value = grounded(rawContent[key], key === "closingLine" ? 160 : 80);
    if (value) content[key] = value;
  }
  const description = grounded(rawContent.rsvpDescription, 300);
  if (description) content.rsvpDescription = description;
  const dress = grounded(rawContent.dressCode, 300);
  if (dress) content.dressCode = { body: dress };
  const story = rawContent.story as Record<string, unknown> | null;
  if (story && typeof story === "object") {
    const heading = grounded(story.heading, 140);
    const paragraphs = (Array.isArray(story.paragraphs) ? story.paragraphs : []).map((item) => grounded(item, 1200)).filter(Boolean).slice(0, 4);
    if (heading && paragraphs.length) content.story = { heading, paragraphs, ...(grounded(story.eyebrow, 60) ? { eyebrow: grounded(story.eyebrow, 60) } : {}), ...(grounded(story.signature, 80) ? { signature: grounded(story.signature, 80) } : {}) };
  }
  if (Array.isArray(rawContent.goodToKnow)) {
    const items = rawContent.goodToKnow.flatMap((item) => {
      const entry = (item ?? {}) as Record<string, unknown>;
      const title = grounded(entry.title, 80);
      const body = grounded(entry.body, 500);
      return title && body ? [{ title, body }] : [];
    }).slice(0, 6);
    if (items.length) content.goodToKnow = items;
  }
  if (Array.isArray(rawContent.travel)) {
    const items = rawContent.travel.flatMap((item) => {
      const entry = (item ?? {}) as Record<string, unknown>;
      const title = grounded(entry.title, 120);
      const body = grounded(entry.body, 500);
      // A link only when the host gave that exact https URL.
      const href = textValue(entry.href, 2048);
      const linkLabel = grounded(entry.linkLabel, 40);
      return title && body ? [{ title, body, ...(href && /^https:\/\//i.test(href) && facts.includes(href) ? { href, ...(linkLabel ? { linkLabel } : {}) } : {}) }] : [];
    }).slice(0, 4);
    if (items.length) content.travel = { items };
  }
  const sectionList = (value: unknown) => (Array.isArray(value) ? value : []).filter((key): key is SectionKey => typeof key === "string" && (SECTION_KEYS as readonly string[]).includes(key));
  const rawVariants = (design.variants as Record<string, unknown>) ?? {};
  const variants = Object.fromEntries(SECTION_KEYS.flatMap((key) => typeof rawVariants[key] === "string" && (SECTION_VARIANTS[key] as readonly string[]).includes(rawVariants[key] as string) ? [[key, rawVariants[key]]] : []));
  const candidate: DesignPatch = {
    ...(typeof design.styleKey === "string" && (STYLE_KEYS as readonly string[]).includes(design.styleKey) ? { styleKey: design.styleKey as DesignPatch["styleKey"] } : {}),
    ...(typeof design.paletteKey === "string" ? { paletteKey: design.paletteKey } : {}),
    ...(Object.keys(content).length ? { content: content as DesignPatch["content"] } : {}),
    ...(Array.isArray(design.clearContent) && design.clearContent.length ? { clearContent: design.clearContent.filter((key): key is DesignPatch["clearContent"] extends (infer T)[] | undefined ? T : never => typeof key === "string" && (CONTENT_KEYS as readonly string[]).includes(key)) } : {}),
    ...(sectionList(design.hide).length ? { hide: sectionList(design.hide) } : {}),
    ...(sectionList(design.show).length ? { show: sectionList(design.show) } : {}),
    ...(sectionList(design.order).length ? { order: [...new Set(sectionList(design.order))] } : {}),
    ...(Object.keys(variants).length ? { variants } : {}),
  };
  const parsed = designPatchSchema.safeParse(candidate);
  const { content: _dropped, ...withoutContent } = candidate;
  void _dropped;
  return {
    message: String(raw.message ?? "I updated your site."),
    summary: String(raw.summary ?? "Updated the site"),
    eventPatch: normalizeEventPatch((raw.eventPatch as Record<string, unknown>) ?? {}),
    designPatch: parsed.success ? parsed.data : designPatchSchema.parse(withoutContent),
  };
}

function designFacts(prompt: string, config: EventConfig, design: EventDesign) {
  return `${prompt}\n${JSON.stringify({ ...config, design: undefined })}\n${JSON.stringify(design.content)}`;
}

async function requestDesignEdit(prompt: string, config: EventConfig, design: EventDesign, messages: BuilderMessage[], selectedNodeIds: string[], deadline?: number): Promise<{ edit: DesignAgentEdit; responseId: string | null }> {
  const fallback = () => {
    const result = fallbackDesignPatch(prompt, design);
    return { edit: { message: result.message, summary: result.summary, eventPatch: {}, designPatch: result.patch }, responseId: null };
  };
  const key = env.openaiApiKey();
  const timeoutMs = aiCallTimeoutMs(deadline);
  if (!key || timeoutMs === null) return fallback();
  const styles = STYLE_KEYS.map((styleKey) => ({ styleKey, name: DESIGN_STYLES[styleKey].name, identity: DESIGN_STYLES[styleKey].identity, palettes: DESIGN_STYLES[styleKey].palettes.map((palette) => ({ paletteKey: palette.key, name: palette.name })) }));
  const selectedSections = selectedNodeIds.map(sectionKindFromPuckId).filter(Boolean);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...openaiResponsesOptions("studio-edit"),
      input: [
        { role: "system", content: "You are Eventloom's design assistant for a page built from an approved design system. Make the smallest change that satisfies the request. You can switch the style or the palette (only from the listed keys; a palette must belong to the chosen style), rewrite or clear page copy, show, hide or reorder sections, and pick a section layout from its allowed variants. You never set colors, fonts or sizes. In design, null and empty arrays mean unchanged; list content keys in clearContent only to remove copy. In eventPatch, null means unchanged. Never invent names, dates, times, venues, addresses, URLs, dress codes or policies the host didn't give. Hero and RSVP can never be hidden. Return concise user-facing copy." },
        { role: "user", content: JSON.stringify({ request: prompt, selectedSections, event: { ...config, design: undefined }, design, styles, sectionVariants: SECTION_VARIANTS, recentConversation: messages.slice(-8).map((message) => ({ role: message.role, content: message.content })) }) },
      ],
      text: { format: { type: "json_schema", name: "eventloom_design_edit", strict: true, schema: designEditSchema } },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => null);
  if (!response?.ok) return fallback();
  const data = await response.json().catch(() => null) as { id?: string; output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  const output = data?.output_text ?? data?.output?.flatMap((item) => item.content ?? []).map((content) => content.text).filter(Boolean).join("\n");
  if (!output) return fallback();
  try {
    return { edit: normalizeDesignEdit(JSON.parse(output) as Record<string, unknown>, designFacts(prompt, config, design)), responseId: data?.id ?? null };
  } catch {
    return fallback();
  }
}

type PreparedEdit = { message: string; summary: string; config: EventConfig; document: SiteDocument; changedNodeIds: string[]; responseId: string | null };

/** The edit to commit for a run: a design patch for designed events, site-document operations for legacy ones. */
async function prepareEdit(input: { prompt: string; selectedNodeIds: string[]; deadline?: number }, revision: { config: EventConfig; document: SiteDocument }, messages: BuilderMessage[], assertNotCancelled: () => Promise<void>, onApplying: (summary: string) => Promise<unknown>): Promise<PreparedEdit> {
  const design = readEventDesign(revision.config);
  if (design) {
    const { edit, responseId } = await requestDesignEdit(input.prompt, revision.config, design, messages, input.selectedNodeIds, input.deadline);
    await assertNotCancelled();
    await onApplying(edit.summary);
    const patched = Object.keys(edit.eventPatch).length ? applyEventDetailsPatch(revision.config, edit.eventPatch) : revision.config;
    const config = { ...patched, design: applyDesignPatch(design, edit.designPatch) };
    return { message: edit.message, summary: edit.summary, config, document: revision.document, changedNodeIds: sectionsTouchedBy(edit.designPatch).map(sectionPuckId), responseId };
  }
  const generated = await requestAgentEdit(input.prompt, revision.document, revision.config, messages, input.selectedNodeIds, input.deadline);
  const edit = "edit" in generated ? generated.edit : generated;
  const responseId = "responseId" in generated ? generated.responseId : null;
  await assertNotCancelled();
  await onApplying(edit.summary);
  const config = Object.keys(edit.eventPatch).length ? applyEventDetailsPatch(revision.config, edit.eventPatch) : revision.config;
  const applied = edit.operations.length ? applySiteOperations(revision.document, edit.operations) : { document: revision.document, changedNodeIds: [] };
  return { message: edit.message, summary: edit.summary, config, document: applied.document, changedNodeIds: applied.changedNodeIds, responseId };
}

export async function executeStudioRun(input: { jobId: string; eventId: string; ownerId: string; prompt: string; selectedNodeIds: string[]; deadline?: number }) {
  // Once the provider has been called the credit is consumed, even if the run is cancelled or fails afterwards.
  let providerCalled = false;
  try {
    const state = await loadStudioState(input.eventId, input.ownerId);
    if (!state) throw new Error("event_not_found");
    const run = await getStudioRun(input.jobId);
    if (run?.cancel_requested) throw new Error("run_cancelled");
    await appendRunEvent(input.jobId, input.eventId, "status", { stage: "analyzing", message: run?.kind === "initial" ? "Designing your site from the brief…" : "Understanding your request…" });
    providerCalled = Boolean(env.openaiApiKey()) && aiCallTimeoutMs(input.deadline) !== null;
    if (run?.kind === "initial") {
      const original = await generateOriginalSite(input.prompt, state.revision.config, { deadline: input.deadline });
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

    const assertNotCancelled = async () => {
      const current = await getStudioRun(input.jobId);
      if (current?.cancel_requested) throw new Error("run_cancelled");
    };
    const edit = await prepareEdit(input, state.revision, state.messages, assertNotCancelled, (summary) => appendRunEvent(input.jobId, input.eventId, "status", { stage: "applying", message: summary }));

    await assertNotCancelled();
    await appendRunEvent(input.jobId, input.eventId, "patch", { document: edit.document, config: edit.config, changedNodeIds: edit.changedNodeIds, summary: edit.summary });
    await appendRunEvent(input.jobId, input.eventId, "status", { stage: "saving", message: "Validating and saving this version…" });
    const committed = await commitStudioRevision({ eventId: input.eventId, ownerId: input.ownerId, baseVersionId: state.revision.id, document: edit.document, config: edit.config, source: "ai", summary: edit.summary, prompt: input.prompt });
    if (!committed.ok) throw new Error(committed.error);
    const assistant = await createBuilderMessage({ eventId: input.eventId, runId: input.jobId, role: "assistant", content: edit.message, selectedNodeIds: edit.changedNodeIds, versionId: committed.revision.id, ownerId: input.ownerId });
    await updateStudioRun(input.jobId, { status: "succeeded", result_version_id: committed.revision.id, response_id: edit.responseId, progress_step: "done", progress_percent: 100, progress_message: edit.summary, completed_at: new Date().toISOString() });
    await appendRunEvent(input.jobId, input.eventId, "committed", { revision: committed.revision, message: assistant, changedNodeIds: edit.changedNodeIds, summary: edit.summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent_run_failed";
    const cancelled = message === "run_cancelled";
    await updateStudioRun(input.jobId, { status: "failed", error: message, progress_step: "error", progress_message: cancelled ? "Stopped" : "The edit could not be applied.", completed_at: new Date().toISOString() });
    await appendRunEvent(input.jobId, input.eventId, cancelled ? "cancelled" : "error", { message: cancelled ? "Stopped before saving changes." : message });
    if (!providerCalled) await refundBuildCredit(input.ownerId, input.eventId, input.jobId);
  }
}
