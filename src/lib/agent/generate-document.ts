import "server-only";

import { groundConfigInPrompt } from "@/lib/agent/generate-config";
import { env, openaiResponsesOptions } from "@/lib/env";
import {
  composeSiteDocument,
  newSiteNodeId,
  siteDocumentSchema,
  walkSiteNodes,
  type SiteDocument,
  type SiteLayoutNode,
  type SiteNode,
  type SiteStyle,
  type SiteTextBinding,
} from "@/lib/site-document";
import { ensureSiteContrast } from "@/lib/site-contrast";
import type { EventConfig } from "@/lib/types";

export type GeneratedOriginalSite = {
  document: SiteDocument;
  config: EventConfig;
  message: string;
  summary: string;
};

const styleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    background: { type: ["string", "null"] },
    color: { type: ["string", "null"] },
    accent: { type: ["string", "null"] },
    align: { type: ["string", "null"], enum: ["left", "center", "right", null] },
    width: { type: ["string", "null"], enum: ["full", "wide", "content", "narrow", null] },
    padding: { type: ["string", "null"], enum: ["none", "small", "medium", "large", "hero", null] },
    gap: { type: ["string", "null"], enum: ["none", "small", "medium", "large", null] },
    radius: { type: ["string", "null"], enum: ["none", "small", "medium", "large", "pill", null] },
    columns: { type: ["integer", "null"], enum: [1, 2, 3, 4, null] },
    minHeight: { type: ["string", "null"], enum: ["auto", "screen", "threeQuarter", "half", null] },
    font: { type: ["string", "null"], enum: ["display", "body", "mono", null] },
    size: { type: ["string", "null"], enum: ["xs", "sm", "md", "lg", "xl", "hero", null] },
    weight: { type: ["string", "null"], enum: ["regular", "medium", "semibold", "bold", null] },
    texture: { type: ["string", "null"], enum: ["none", "paper", "grain", "linen", "wash", null] },
    letterSpacing: { type: ["string", "null"], enum: ["tight", "normal", "wide", "widest", null] },
    italic: { type: ["boolean", "null"] },
    opacity: { type: ["string", "null"], enum: ["full", "muted", "faint", null] },
    border: { type: ["string", "null"], enum: ["none", "hairline", "thick", null] },
    justify: { type: ["string", "null"], enum: ["start", "center", "end", null] },
  },
  required: ["background", "color", "accent", "align", "width", "padding", "gap", "radius", "columns", "minHeight", "font", "size", "weight", "texture", "letterSpacing", "italic", "opacity", "border", "justify"],
} as const;

const blockSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["text", "image", "button", "divider", "gallery", "countdown", "schedule", "venue", "rsvp"] },
    content: { type: ["string", "null"] },
    binding: { type: ["string", "null"], enum: ["event.title", "event.subtitle", "event.date", "event.venueName", "event.venueAddress", null] },
    variant: { type: ["string", "null"], enum: ["eyebrow", "heading", "subheading", "body", "caption", null] },
    url: { type: ["string", "null"] },
    alt: { type: ["string", "null"] },
    href: { type: ["string", "null"] },
    buttonLabel: { type: ["string", "null"] },
    buttonVariant: { type: ["string", "null"], enum: ["primary", "secondary", "ghost", null] },
    showMap: { type: ["boolean", "null"] },
    heading: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    style: styleSchema,
  },
  required: ["type", "content", "binding", "variant", "url", "alt", "href", "buttonLabel", "buttonVariant", "showMap", "heading", "description", "style"],
} as const;

const rowSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["stack", "grid", "overlay", "section"] },
    label: { type: "string" },
    style: styleSchema,
    blocks: { type: "array", minItems: 1, maxItems: 10, items: blockSchema },
  },
  required: ["type", "label", "style", "blocks"],
} as const;

const originalSiteSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    message: { type: "string" },
    summary: { type: "string" },
    concept: { type: "string" },
    locale: { type: "string" },
    direction: { type: "string", enum: ["ltr", "rtl", "auto"] },
    theme: {
      type: "object",
      additionalProperties: false,
      properties: {
        text: { type: "string" },
        surface: { type: "string" },
        accent: { type: "string" },
        muted: { type: "string" },
        display: { type: "string", enum: ["editorial", "romantic", "modern", "playful"] },
        body: { type: "string", enum: ["clean", "humanist", "geometric"] },
        radius: { type: "string", enum: ["sharp", "soft", "round"] },
        motion: { type: "string", enum: ["none", "subtle", "expressive"] },
        texture: { type: "string", enum: ["none", "paper", "grain", "linen", "wash"] },
      },
      required: ["text", "surface", "accent", "muted", "display", "body", "radius", "motion", "texture"],
    },
    event: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        eventType: { type: "string" },
        date: { type: "string" },
        venueName: { type: "string" },
        venueAddress: { type: "string" },
        rsvpDeadline: { type: "string" },
        schedule: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              time: { type: "string" },
              location: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "time", "location", "description"],
          },
        },
      },
      required: ["title", "subtitle", "eventType", "date", "venueName", "venueAddress", "rsvpDeadline", "schedule"],
    },
    sections: {
      type: "array",
      minItems: 2,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["section", "stack", "grid", "overlay"] },
          label: { type: "string" },
          style: styleSchema,
          rows: { type: "array", minItems: 1, maxItems: 6, items: rowSchema },
        },
        required: ["type", "label", "style", "rows"],
      },
    },
  },
  required: ["message", "summary", "concept", "locale", "direction", "theme", "event", "sections"],
} as const;

const ART_DIRECTOR = `You are Eventloom's generative art director. Design a complete event website from a blank canvas — never from a template, preset section order, or generic invitation layout.

Quality bar:
- The page must be readable first. Every text color needs a contrasting field behind it: dark type on ivory/paper, or ivory type on charcoal, ink, sage, or wine. Never place light type on a light field. If a section uses light type, that section MUST set a dark background hex.
- Paper, grain, linen, and wash are overlays only. They do not replace the section background. Always set a solid hex background on full-bleed sections.
- Typography is the primary craft, but names must stay legible in a studio preview. Use large display type, not faint watermark type. Do not set opacity to faint on headings or names. Do not use wide/widest tracking on hero names.
- Split couple names onto two lines when helpful. Keep them upright, high-contrast, and on a real color field.
- Atmosphere copy is allowed. Invented facts are not. Never invent names, dates, times, venues, addresses, or URLs. Bind known facts to event.title, event.subtitle, event.date, event.venueName, or event.venueAddress. If a fact is missing, say so in the bound value — do not add WHEN/WHERE/ADDRESS labels with empty values.
- Always include exactly one RSVP block, visually belonging to the design rather than looking like a form dropped at the end.
- Forbidden: generic centered-card heroes, "The celebration", "Meet us there", "Will you join us?" as default copy, repeating three-band cream/white/green pages, stock wedding layouts, ghost type, vertical stacked single-letter names, low-contrast overlays.

Return a short user-facing message about the design you made.`;

function asStyle(raw: Record<string, unknown> | null | undefined): SiteStyle | undefined {
  if (!raw) return undefined;
  const style = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== null && value !== undefined)) as SiteStyle;
  return Object.keys(style).length ? style : undefined;
}

function asBlock(raw: Record<string, unknown>): SiteNode | null {
  const type = String(raw.type ?? "");
  const style = asStyle(raw.style as Record<string, unknown> | undefined);
  const id = newSiteNodeId(type.slice(0, 8) || "block");
  if (type === "text") {
    const binding = typeof raw.binding === "string" ? raw.binding as SiteTextBinding : undefined;
    const content = typeof raw.content === "string" ? raw.content : undefined;
    const variant = raw.variant === "eyebrow" || raw.variant === "heading" || raw.variant === "subheading" || raw.variant === "body" || raw.variant === "caption" ? raw.variant : "body";
    if (!binding && !content) return null;
    return { id, type, content, binding, variant, style };
  }
  if (type === "image") return { id, type, url: typeof raw.url === "string" ? raw.url : undefined, alt: typeof raw.alt === "string" && raw.alt.trim() ? raw.alt : "Event image", style };
  if (type === "button" && typeof raw.buttonLabel === "string" && typeof raw.href === "string") {
    return { id, type, label: raw.buttonLabel, href: raw.href, variant: typeof raw.buttonVariant === "string" ? raw.buttonVariant as "primary" : undefined, style };
  }
  if (type === "divider") return { id, type, style };
  if (type === "countdown") return { id, type, style };
  if (type === "schedule") return { id, type, style };
  if (type === "venue") return { id, type, showMap: raw.showMap !== false, style };
  if (type === "rsvp") return { id, type, heading: typeof raw.heading === "string" ? raw.heading : undefined, description: typeof raw.description === "string" ? raw.description : undefined, style };
  return null;
}

function asChildren(blocks: unknown): SiteNode[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block) => {
    if (!block || typeof block !== "object") return [];
    const node = asBlock(block as Record<string, unknown>);
    return node ? [node] : [];
  });
}

function hex(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function assembleDocument(raw: Record<string, unknown>, config: EventConfig, prompt: string): SiteDocument {
  const theme = (raw.theme as Record<string, unknown>) ?? {};
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const nodes: SiteLayoutNode[] = sections.flatMap((section) => {
    if (!section || typeof section !== "object") return [];
    const entry = section as Record<string, unknown>;
    const type = ["section", "stack", "grid", "overlay"].includes(String(entry.type)) ? String(entry.type) as SiteLayoutNode["type"] : "section";
    const rows = Array.isArray(entry.rows) ? entry.rows : [];
    const children = rows.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const item = row as Record<string, unknown>;
      const blocks = asChildren(item.blocks);
      if (!blocks.length) return [];
      const rowType = ["section", "stack", "grid", "overlay"].includes(String(item.type)) ? String(item.type) as SiteLayoutNode["type"] : "stack";
      return [{ id: newSiteNodeId(rowType), type: rowType, label: typeof item.label === "string" ? item.label : undefined, style: asStyle(item.style as Record<string, unknown> | undefined), children: blocks } satisfies SiteLayoutNode];
    });
    if (!children.length) return [];
    return [{ id: newSiteNodeId(type), type, label: typeof entry.label === "string" ? entry.label : undefined, style: asStyle(entry.style as Record<string, unknown> | undefined), children } satisfies SiteLayoutNode];
  });

  if (!walkSiteNodes({ schemaVersion: 2, locale: "en", direction: "auto", theme: { colors: { text: "#111111", surface: "#ffffff", accent: "#888888", muted: "#666666" }, typography: { display: "editorial", body: "clean" }, radius: "soft", motion: "subtle" }, nodes }).some((node) => node.type === "rsvp")) {
    nodes.push({
      id: newSiteNodeId("rsvpsec"),
      type: "section",
      label: "Reply",
      style: { padding: "hero", align: "left", width: "narrow" },
      children: [{ id: newSiteNodeId("rsvp"), type: "rsvp", heading: "Save a place", description: "Reply with the details we need." }],
    });
  }

  const parsed = siteDocumentSchema.safeParse({
    schemaVersion: 2,
    locale: typeof raw.locale === "string" && raw.locale.length >= 2 ? raw.locale.slice(0, 16) : "en",
    direction: raw.direction === "ltr" || raw.direction === "rtl" ? raw.direction : "auto",
    theme: {
      colors: {
        text: hex(theme.text, config.theme.colors[0] ?? "#1f1a17"),
        surface: hex(theme.surface, config.theme.colors[1] ?? "#fbf7f1"),
        accent: hex(theme.accent, config.theme.colors[2] ?? "#9a5d55"),
        muted: hex(theme.muted, config.theme.colors[3] ?? "#747d6c"),
      },
      typography: {
        display: ["editorial", "romantic", "modern", "playful"].includes(String(theme.display)) ? theme.display : "editorial",
        body: ["clean", "humanist", "geometric"].includes(String(theme.body)) ? theme.body : "clean",
      },
      radius: ["sharp", "soft", "round"].includes(String(theme.radius)) ? theme.radius : "soft",
      motion: ["none", "subtle", "expressive"].includes(String(theme.motion)) ? theme.motion : "subtle",
      texture: ["none", "paper", "grain", "linen", "wash"].includes(String(theme.texture)) ? theme.texture : "paper",
    },
    nodes,
  });

  return parsed.success ? ensureSiteContrast(parsed.data) : composeSiteDocument(config, prompt);
}

function configFromGeneratedEvent(base: EventConfig, raw: Record<string, unknown> | undefined, prompt: string): EventConfig {
  const event = raw ?? {};
  const schedule = Array.isArray(event.schedule) ? event.schedule.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.title !== "string" || typeof entry.time !== "string") return [];
    return [{ title: entry.title, time: entry.time, ...(typeof entry.location === "string" ? { location: entry.location } : {}), ...(typeof entry.description === "string" ? { description: entry.description } : {}) }];
  }) : base.schedule;

  return groundConfigInPrompt({
    ...base,
    title: typeof event.title === "string" && event.title.trim() ? event.title : base.title,
    subtitle: typeof event.subtitle === "string" && event.subtitle.trim() ? event.subtitle : base.subtitle,
    eventType: typeof event.eventType === "string" && event.eventType.trim() ? event.eventType : base.eventType,
    date: typeof event.date === "string" && event.date.trim() ? event.date : base.date,
    venueName: typeof event.venueName === "string" && event.venueName.trim() ? event.venueName : base.venueName,
    venueAddress: typeof event.venueAddress === "string" && event.venueAddress.trim() ? event.venueAddress : base.venueAddress,
    rsvpDeadline: typeof event.rsvpDeadline === "string" && event.rsvpDeadline.trim() ? event.rsvpDeadline : base.rsvpDeadline,
    schedule: schedule.length ? schedule : base.schedule,
  }, prompt);
}

export async function generateOriginalSite(prompt: string, config: EventConfig): Promise<GeneratedOriginalSite> {
  const fallback = {
    document: ensureSiteContrast(composeSiteDocument(config, prompt)),
    config: groundConfigInPrompt(config, prompt),
    message: "I designed a first version from your description. Tell me what to change.",
    summary: "Designed the first original version",
  };
  const key = env.openaiApiKey();
  if (!key) return fallback;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...openaiResponsesOptions(),
      reasoning: { effort: "xhigh" },
      input: [
        { role: "system", content: ART_DIRECTOR },
        { role: "user", content: JSON.stringify({ brief: prompt, knownFacts: config, instruction: "Design the complete page now. concept should name the composition in one sentence." }) },
      ],
      text: { format: { type: "json_schema", name: "eventloom_original_site", strict: true, schema: originalSiteSchema } },
    }),
  }).catch(() => null);

  if (!response?.ok) return fallback;
  const data = await response.json().catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  const output = data?.output_text ?? data?.output?.flatMap((item) => item.content ?? []).map((content) => content.text).filter(Boolean).join("\n");
  if (!output) return fallback;

  try {
    const parsed = JSON.parse(output) as Record<string, unknown>;
    const nextConfig = configFromGeneratedEvent(config, parsed.event as Record<string, unknown> | undefined, prompt);
    const concept = typeof parsed.concept === "string" ? parsed.concept.trim() : "";
    const message = typeof parsed.message === "string" && parsed.message.trim() ? parsed.message : fallback.message;
    return {
      document: assembleDocument(parsed, nextConfig, prompt),
      config: nextConfig,
      message: concept ? `${message}${message.endsWith(".") ? "" : "."} ${concept}` : message,
      summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary : fallback.summary,
    };
  } catch {
    return fallback;
  }
}
