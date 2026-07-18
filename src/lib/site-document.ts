import { z } from "zod";
import type { EventConfig } from "@/lib/types";

export const siteNodeTypes = [
  "section",
  "stack",
  "grid",
  "overlay",
  "text",
  "image",
  "button",
  "divider",
  "gallery",
  "countdown",
  "schedule",
  "venue",
  "rsvp",
] as const;

export type SiteNodeType = (typeof siteNodeTypes)[number];
export type SiteTextBinding = "event.title" | "event.subtitle" | "event.date" | "event.venueName" | "event.venueAddress";
export type SiteStyle = {
  background?: string;
  color?: string;
  accent?: string;
  align?: "left" | "center" | "right";
  width?: "full" | "wide" | "content" | "narrow";
  padding?: "none" | "small" | "medium" | "large" | "hero";
  gap?: "none" | "small" | "medium" | "large";
  radius?: "none" | "small" | "medium" | "large" | "pill";
  columns?: 1 | 2 | 3 | 4;
  minHeight?: "auto" | "screen" | "threeQuarter" | "half";
  font?: "display" | "body" | "mono";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  weight?: "regular" | "medium" | "semibold" | "bold";
  hidden?: boolean;
};

type SiteNodeBase = { id: string; type: SiteNodeType; label?: string; style?: SiteStyle };
export type SiteLayoutNode = SiteNodeBase & { type: "section" | "stack" | "grid" | "overlay"; children: SiteNode[] };
export type SiteTextNode = SiteNodeBase & {
  type: "text";
  content?: string;
  binding?: SiteTextBinding;
  variant: "eyebrow" | "heading" | "subheading" | "body" | "caption";
};
export type SiteImageNode = SiteNodeBase & { type: "image"; url?: string; alt: string; fit?: "cover" | "contain" };
export type SiteButtonNode = SiteNodeBase & { type: "button"; label: string; href: string; variant?: "primary" | "secondary" | "ghost" };
export type SiteDividerNode = SiteNodeBase & { type: "divider" };
export type SiteGalleryNode = SiteNodeBase & { type: "gallery"; images: { id: string; url: string; alt: string }[] };
export type SiteCountdownNode = SiteNodeBase & { type: "countdown" };
export type SiteScheduleNode = SiteNodeBase & { type: "schedule" };
export type SiteVenueNode = SiteNodeBase & { type: "venue"; showMap?: boolean };
export type SiteRsvpNode = SiteNodeBase & { type: "rsvp"; heading?: string; description?: string };
export type SiteNode =
  | SiteLayoutNode
  | SiteTextNode
  | SiteImageNode
  | SiteButtonNode
  | SiteDividerNode
  | SiteGalleryNode
  | SiteCountdownNode
  | SiteScheduleNode
  | SiteVenueNode
  | SiteRsvpNode;

export type SiteDocument = {
  schemaVersion: 2;
  locale: string;
  direction: "ltr" | "rtl" | "auto";
  theme: {
    colors: { text: string; surface: string; accent: string; muted: string };
    typography: { display: "editorial" | "romantic" | "modern" | "playful"; body: "clean" | "humanist" | "geometric" };
    radius: "sharp" | "soft" | "round";
    motion: "none" | "subtle" | "expressive";
  };
  nodes: SiteNode[];
};

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
const styleSchema = z.object({
  background: z.string().max(120).optional(),
  color: z.string().max(120).optional(),
  accent: z.string().max(120).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  width: z.enum(["full", "wide", "content", "narrow"]).optional(),
  padding: z.enum(["none", "small", "medium", "large", "hero"]).optional(),
  gap: z.enum(["none", "small", "medium", "large"]).optional(),
  radius: z.enum(["none", "small", "medium", "large", "pill"]).optional(),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  minHeight: z.enum(["auto", "screen", "threeQuarter", "half"]).optional(),
  font: z.enum(["display", "body", "mono"]).optional(),
  size: z.enum(["xs", "sm", "md", "lg", "xl", "hero"]).optional(),
  weight: z.enum(["regular", "medium", "semibold", "bold"]).optional(),
  hidden: z.boolean().optional(),
}).strict();
const baseNode = { id: z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/), label: z.string().max(80).optional(), style: styleSchema.optional() };

const nodeSchema: z.ZodType<SiteNode> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ ...baseNode, type: z.enum(["section", "stack", "grid", "overlay"]), children: z.array(nodeSchema).max(40) }).strict(),
  z.object({ ...baseNode, type: z.literal("text"), content: z.string().max(4000).optional(), binding: z.enum(["event.title", "event.subtitle", "event.date", "event.venueName", "event.venueAddress"]).optional(), variant: z.enum(["eyebrow", "heading", "subheading", "body", "caption"]) }).strict(),
  z.object({ ...baseNode, type: z.literal("image"), url: z.string().max(2048).optional(), alt: z.string().max(300), fit: z.enum(["cover", "contain"]).optional() }).strict(),
  z.object({ ...baseNode, type: z.literal("button"), label: z.string().min(1).max(120), href: z.string().min(1).max(2048), variant: z.enum(["primary", "secondary", "ghost"]).optional() }).strict(),
  z.object({ ...baseNode, type: z.literal("divider") }).strict(),
  z.object({ ...baseNode, type: z.literal("gallery"), images: z.array(z.object({ id: z.string().min(3).max(64), url: z.string().max(2048), alt: z.string().max(300) }).strict()).max(12) }).strict(),
  z.object({ ...baseNode, type: z.literal("countdown") }).strict(),
  z.object({ ...baseNode, type: z.literal("schedule") }).strict(),
  z.object({ ...baseNode, type: z.literal("venue"), showMap: z.boolean().optional() }).strict(),
  z.object({ ...baseNode, type: z.literal("rsvp"), heading: z.string().max(180).optional(), description: z.string().max(600).optional() }).strict(),
]));

export const siteDocumentSchema: z.ZodType<SiteDocument> = z.object({
  schemaVersion: z.literal(2),
  locale: z.string().min(2).max(16),
  direction: z.enum(["ltr", "rtl", "auto"]),
  theme: z.object({
    colors: z.object({ text: colorSchema, surface: colorSchema, accent: colorSchema, muted: colorSchema }).strict(),
    typography: z.object({ display: z.enum(["editorial", "romantic", "modern", "playful"]), body: z.enum(["clean", "humanist", "geometric"]) }).strict(),
    radius: z.enum(["sharp", "soft", "round"]),
    motion: z.enum(["none", "subtle", "expressive"]),
  }).strict(),
  nodes: z.array(nodeSchema).min(1).max(30),
}).strict().superRefine((document, context) => {
  const ids = new Set<string>();
  let count = 0;
  let hasRsvp = false;
  const safeUrl = (value: string) => value.startsWith("/") || value.startsWith("#") || /^https:\/\//i.test(value);
  const visit = (nodes: SiteNode[], depth: number) => {
    if (depth > 8) context.addIssue({ code: "custom", message: "Site document nesting is too deep." });
    for (const node of nodes) {
      count += 1;
      if (ids.has(node.id)) context.addIssue({ code: "custom", message: `Duplicate node id: ${node.id}` });
      ids.add(node.id);
      if (node.type === "rsvp") hasRsvp = true;
      if ((node.type === "image" && node.url && !safeUrl(node.url)) || (node.type === "button" && !safeUrl(node.href))) {
        context.addIssue({ code: "custom", message: `Unsafe URL in node: ${node.id}` });
      }
      if (node.type === "gallery" && node.images.some((image) => !safeUrl(image.url))) {
        context.addIssue({ code: "custom", message: `Unsafe gallery URL in node: ${node.id}` });
      }
      if ("children" in node) visit(node.children, depth + 1);
    }
  };
  visit(document.nodes, 0);
  if (count > 160) context.addIssue({ code: "custom", message: "Site document contains too many nodes." });
  if (!hasRsvp) context.addIssue({ code: "custom", message: "Site document must contain one RSVP block." });
});

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

export function createDefaultSiteDocument(config: EventConfig, makeId: (prefix: string) => string = id): SiteDocument {
  const colors = config.theme.colors.length >= 4 ? config.theme.colors : ["#1f1a17", "#fbf7f1", "#9a5d55", "#747d6c"];
  const heroImage = config.heroImageUrl;
  return siteDocumentSchema.parse({
    schemaVersion: 2,
    locale: "en",
    direction: "auto",
    theme: {
      colors: { text: colors[0], surface: colors[1], accent: colors[2], muted: colors[3] },
      typography: { display: /romantic|wedding|elegant/i.test(config.theme.mood) ? "romantic" : "editorial", body: "clean" },
      radius: "soft",
      motion: "subtle",
    },
    nodes: [
      {
        id: makeId("hero"), type: "section", label: "Hero", style: { padding: "large", minHeight: "auto", align: "center", width: "wide", gap: "medium" }, children: [
          { id: makeId("eyebrow"), type: "text", content: config.eventType, variant: "eyebrow", style: { font: "body", size: "xs", weight: "semibold" } },
          { id: makeId("title"), type: "text", binding: "event.title", variant: "heading", style: { font: "display", size: "hero", weight: "semibold" } },
          { id: makeId("subtitle"), type: "text", binding: "event.subtitle", variant: "subheading", style: { font: "body", size: "lg" } },
          ...(heroImage ? [{ id: makeId("image"), type: "image" as const, url: heroImage, alt: `${config.title} event`, fit: "cover" as const, style: { radius: "large" as const, width: "wide" as const } }] : []),
          { id: makeId("date"), type: "text", binding: "event.date", variant: "body", style: { size: "md", weight: "medium" } },
        ],
      },
      { id: makeId("schedule"), type: "section", label: "Schedule", style: { padding: "large", width: "wide" }, children: [
        { id: makeId("schedule_heading"), type: "text", content: "The celebration", variant: "heading", style: { font: "display", size: "xl" } },
        { id: makeId("schedule_list"), type: "schedule" },
      ] },
      { id: makeId("venue"), type: "section", label: "Venue", style: { padding: "large", background: colors[3], color: colors[1] }, children: [
        { id: makeId("venue_heading"), type: "text", content: "Meet us there", variant: "heading", style: { font: "display", size: "xl" } },
        { id: makeId("venue_details"), type: "venue", showMap: true },
      ] },
      { id: makeId("rsvp_section"), type: "section", label: "RSVP", style: { padding: "large", align: "center", width: "wide" }, children: [
        { id: makeId("rsvp"), type: "rsvp", heading: "Will you join us?", description: "Please reply using the form below." },
      ] },
    ],
  });
}

export function walkSiteNodes(document: SiteDocument) {
  const result: SiteNode[] = [];
  const visit = (nodes: SiteNode[]) => nodes.forEach((node) => {
    result.push(node);
    if ("children" in node) visit(node.children);
  });
  visit(document.nodes);
  return result;
}

export function assertEventAssetOwnership(document: SiteDocument, eventId: string) {
  const marker = "/storage/v1/object/public/event-assets/";
  const urls = walkSiteNodes(document).flatMap((node) => {
    if (node.type === "image" && node.url) return [node.url];
    if (node.type === "gallery") return node.images.map((image) => image.url);
    return [];
  });
  for (const value of urls) {
    let path = value;
    try { path = new URL(value, "https://eventloom.local").pathname; } catch { continue; }
    const position = path.indexOf(marker);
    if (position < 0) continue;
    const owner = decodeURIComponent(path.slice(position + marker.length).split("/")[0] ?? "");
    if (owner && owner !== eventId) throw new Error("asset_not_owned_by_event");
  }
}

export function findSiteNode(document: SiteDocument, nodeId: string) {
  return walkSiteNodes(document).find((node) => node.id === nodeId) ?? null;
}
