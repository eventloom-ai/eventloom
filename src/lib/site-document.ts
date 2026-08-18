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
export type SiteTextBinding = "event.title" | "event.subtitle" | "event.date" | "event.venueName" | "event.venueAddress" | "event.initials";
export type SiteTexture = "none" | "paper" | "grain" | "linen" | "wash";
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
  texture?: SiteTexture;
  letterSpacing?: "tight" | "normal" | "wide" | "widest";
  italic?: boolean;
  opacity?: "full" | "muted" | "faint";
  border?: "none" | "hairline" | "thick";
  justify?: "start" | "center" | "end";
  rotate?: "none" | "left" | "right";
  offset?: "none" | "raised" | "lowered";
};

type SiteNodeBase = { id: string; type: SiteNodeType; label?: string; style?: SiteStyle };
export type SiteLayoutNode = SiteNodeBase & { type: "section" | "stack" | "grid" | "overlay"; children: SiteNode[] };
export type SiteTextNode = SiteNodeBase & {
  type: "text";
  content?: string;
  binding?: SiteTextBinding;
  variant: "eyebrow" | "heading" | "subheading" | "body" | "caption" | "quote";
};
export type SiteImageNode = SiteNodeBase & { type: "image"; url?: string; alt: string; fit?: "cover" | "contain" };
export type SiteButtonNode = SiteNodeBase & { type: "button"; label: string; href: string; variant?: "primary" | "secondary" | "ghost" };
export type SiteDividerNode = SiteNodeBase & { type: "divider"; dividerVariant?: "line" | "ornament" | "dot" };
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
    typography: {
      display: "editorial" | "romantic" | "modern" | "playful" | "bold" | "vintage" | "elegant" | "condensed";
      body: "clean" | "humanist" | "geometric" | "serif" | "warm";
    };
    radius: "sharp" | "soft" | "round";
    motion: "none" | "subtle" | "expressive";
    texture?: SiteTexture;
  };
  nodes: SiteNode[];
};

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
const styleSchema = z.object({
  background: z.string().max(280).optional(),
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
  texture: z.enum(["none", "paper", "grain", "linen", "wash"]).optional(),
  letterSpacing: z.enum(["tight", "normal", "wide", "widest"]).optional(),
  italic: z.boolean().optional(),
  opacity: z.enum(["full", "muted", "faint"]).optional(),
  border: z.enum(["none", "hairline", "thick"]).optional(),
  justify: z.enum(["start", "center", "end"]).optional(),
  rotate: z.enum(["none", "left", "right"]).optional(),
  offset: z.enum(["none", "raised", "lowered"]).optional(),
}).strict();
const baseNode = { id: z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/), label: z.string().max(80).optional(), style: styleSchema.optional() };
// Wide enough to hold a base64 data: URI (demo mode has no storage backend, so uploads inline as data URIs).
const imageUrlMaxLength = 8_000_000;

const nodeSchema: z.ZodType<SiteNode> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ ...baseNode, type: z.enum(["section", "stack", "grid", "overlay"]), children: z.array(nodeSchema).max(40) }).strict(),
  z.object({ ...baseNode, type: z.literal("text"), content: z.string().max(4000).optional(), binding: z.enum(["event.title", "event.subtitle", "event.date", "event.venueName", "event.venueAddress", "event.initials"]).optional(), variant: z.enum(["eyebrow", "heading", "subheading", "body", "caption", "quote"]) }).strict(),
  z.object({ ...baseNode, type: z.literal("image"), url: z.string().max(imageUrlMaxLength).optional(), alt: z.string().max(300), fit: z.enum(["cover", "contain"]).optional() }).strict(),
  z.object({ ...baseNode, type: z.literal("button"), label: z.string().min(1).max(120), href: z.string().min(1).max(2048), variant: z.enum(["primary", "secondary", "ghost"]).optional() }).strict(),
  z.object({ ...baseNode, type: z.literal("divider"), dividerVariant: z.enum(["line", "ornament", "dot"]).optional() }).strict(),
  z.object({ ...baseNode, type: z.literal("gallery"), images: z.array(z.object({ id: z.string().min(3).max(64), url: z.string().max(imageUrlMaxLength), alt: z.string().max(300) }).strict()).max(12) }).strict(),
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
    typography: z.object({
      display: z.enum(["editorial", "romantic", "modern", "playful", "bold", "vintage", "elegant", "condensed"]),
      body: z.enum(["clean", "humanist", "geometric", "serif", "warm"]),
    }).strict(),
    radius: z.enum(["sharp", "soft", "round"]),
    motion: z.enum(["none", "subtle", "expressive"]),
    texture: z.enum(["none", "paper", "grain", "linen", "wash"]).optional(),
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

export function newSiteNodeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

function fingerprint(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function themeFromConfig(config: EventConfig, prompt: string) {
  const colors = config.theme.colors.length >= 4 ? config.theme.colors : ["#1f1a17", "#fbf7f1", "#9a5d55", "#747d6c"];
  const source = `${config.theme.mood} ${config.eventType} ${prompt}`;
  return {
    colors: { text: colors[0], surface: colors[1], accent: colors[2], muted: colors[3] },
    typography: {
      display: /playful|birthday|kids|children/i.test(source) ? "playful" as const
        : /romantic|wedding|intimate|garden/i.test(source) ? "romantic" as const
        : /startup|tech|\blaunch\b/i.test(source) ? "modern" as const
        : /corporate|conference|gala|professional/i.test(source) ? "bold" as const
        : /vintage|retro|old[- ]?world/i.test(source) ? "vintage" as const
        : /luxury|fashion|black[- ]?tie|formal/i.test(source) ? "elegant" as const
        : /sport|festival|street|loud/i.test(source) ? "condensed" as const
        : "editorial" as const,
      body: /geometric|graphic|bold/i.test(source) ? "geometric" as const
        : /humanist|friendly|garden/i.test(source) ? "humanist" as const
        : /editorial|literary|magazine/i.test(source) ? "serif" as const
        : /casual|cozy|relaxed/i.test(source) ? "warm" as const
        : "clean" as const,
    },
    radius: /sharp|modern|corporate/i.test(source) ? "sharp" as const : /round|playful/i.test(source) ? "round" as const : "soft" as const,
    motion: /still|none|quiet/i.test(source) ? "none" as const : /expressive|bold|party/i.test(source) ? "expressive" as const : "subtle" as const,
    texture: /garden|paper|linen|wedding|elegant/i.test(source) ? "paper" as const : /party|bold|graphic/i.test(source) ? "grain" as const : "wash" as const,
  };
}

function rsvpCopy(config: EventConfig) {
  if (/wedding/i.test(config.eventType)) return { heading: "Will you celebrate with us?", description: "Please reply so we can plan for you." };
  if (/birthday|party/i.test(config.eventType)) return { heading: "Can you make it?", description: "Tell us if you’ll be there." };
  return { heading: "Will you join us?", description: "Reply with the details we need." };
}

export function composeSiteDocument(config: EventConfig, prompt = "", makeId: (prefix: string) => string = newSiteNodeId): SiteDocument {
  const theme = themeFromConfig(config, prompt);
  const colors = [theme.colors.text, theme.colors.surface, theme.colors.accent, theme.colors.muted];
  const heroImage = config.heroImageUrl;
  const rsvp = rsvpCopy(config);
  const composition = fingerprint(`${prompt}|${config.title}|${config.eventType}|${config.theme.mood}`) % 4;
  const titleLines = config.title.split(/\s*&\s*|\s+and\s+/i);
  const openingCopy: SiteNode[] = [
    { id: makeId("eyebrow"), type: "text", content: config.eventType, variant: "eyebrow", style: { font: "body", size: "xs", weight: "semibold", letterSpacing: "widest", opacity: "muted" } },
    titleLines.length === 2
      ? { id: makeId("title"), type: "text", content: `${titleLines[0].trim()}\n&\n${titleLines[1].trim()}`, variant: "heading", style: { font: "display", size: "hero", weight: "regular", letterSpacing: "tight", italic: theme.typography.display === "romantic" } }
      : { id: makeId("title"), type: "text", binding: "event.title", variant: "heading", style: { font: "display", size: "hero", weight: "regular", letterSpacing: "tight" } },
    { id: makeId("subtitle"), type: "text", binding: "event.subtitle", variant: "subheading", style: { font: "body", size: "lg", opacity: "muted" } },
    { id: makeId("date"), type: "text", binding: "event.date", variant: "caption", style: { size: "sm", weight: "medium", letterSpacing: "wide" } },
  ];
  if (heroImage) openingCopy.splice(2, 0, { id: makeId("image"), type: "image", url: heroImage, alt: `${config.title} event`, fit: "cover", style: { radius: "large", width: "wide", minHeight: "half" } });

  const details: SiteNode = {
    id: makeId("details"),
    type: "grid",
    label: "Details",
    style: { columns: 2, gap: "large", width: "wide", padding: "hero" },
    children: [
      { id: makeId("when"), type: "stack", style: { gap: "small" }, children: [
        { id: makeId("when_label"), type: "text", content: "When", variant: "caption", style: { size: "xs", weight: "semibold", letterSpacing: "widest" } },
        { id: makeId("when_value"), type: "text", binding: "event.date", variant: "heading", style: { font: "display", size: "xl", italic: true } },
      ] },
      { id: makeId("where"), type: "stack", style: { gap: "small" }, children: [
        { id: makeId("where_label"), type: "text", content: "Where", variant: "caption", style: { size: "xs", weight: "semibold", letterSpacing: "widest" } },
        { id: makeId("where_value"), type: "venue", showMap: true },
      ] },
    ],
  };

  const scheduleSection: SiteNode | null = config.schedule.some((item) => item.title && item.title !== "Event details")
    ? { id: makeId("schedule"), type: "section", label: "Plan", style: { padding: "large", width: "narrow", gap: "medium", align: "left" }, children: [
        { id: makeId("schedule_heading"), type: "text", content: "The hours", variant: "heading", style: { font: "display", size: "xl", italic: true } },
        { id: makeId("schedule_list"), type: "schedule" },
      ] }
    : null;

  const rsvpSection: SiteNode = {
    id: makeId("rsvp_section"), type: "section", label: "Reply", style: { padding: "hero", align: "left", width: "narrow", background: colors[0], color: colors[1], texture: "wash" }, children: [
      { id: makeId("rsvp"), type: "rsvp", heading: rsvp.heading, description: rsvp.description, style: { align: "left" } },
    ],
  };

  const nodes: SiteNode[] = composition === 1
    ? [
        { id: makeId("opening"), type: "section", label: "Opening", style: { minHeight: "screen", padding: "hero", align: "center", width: "full", gap: "medium", background: colors[0], color: colors[1], texture: "paper", justify: "center" }, children: openingCopy },
        details,
        rsvpSection,
      ]
    : composition === 2
      ? [
          { id: makeId("opening"), type: "grid", label: "Opening", style: { padding: "hero", columns: 2, gap: "large", width: "full", minHeight: "screen", background: colors[1], color: colors[0], texture: "linen" }, children: [
            { id: makeId("opening_copy"), type: "stack", style: { gap: "medium", align: "left", justify: "end", padding: "large" }, children: openingCopy.filter((node) => node.type !== "image") },
            { id: makeId("opening_panel"), type: "stack", style: { gap: "large", padding: "large", background: colors[0], color: colors[1], justify: "center" }, children: [
              { id: makeId("date_block"), type: "text", binding: "event.date", variant: "heading", style: { font: "display", size: "xl", italic: true } },
              { id: makeId("venue_block"), type: "venue", showMap: true },
            ] },
          ] },
          ...(scheduleSection ? [scheduleSection] : []),
          rsvpSection,
        ]
      : composition === 3
        ? [
            { id: makeId("opening"), type: "section", label: "Opening", style: { padding: "hero", align: "left", width: "narrow", gap: "medium", minHeight: "threeQuarter", justify: "end" }, children: openingCopy },
            { id: makeId("band"), type: "section", label: "Place", style: { padding: "large", background: colors[3], color: colors[1], width: "full", texture: "grain" }, children: [{ id: makeId("place_venue"), type: "venue", showMap: true }] },
            rsvpSection,
          ]
        : [
            { id: makeId("opening"), type: "section", label: "Opening", style: { minHeight: "screen", padding: "hero", align: "left", width: "full", gap: "medium", background: `linear-gradient(165deg, ${colors[0]} 0%, ${colors[3]} 100%)`, color: colors[1], texture: "paper", justify: "end" }, children: openingCopy },
            details,
            ...(scheduleSection ? [scheduleSection] : []),
            rsvpSection,
          ];

  return siteDocumentSchema.parse({
    schemaVersion: 2,
    locale: /arabic|\bar\b|عربي/i.test(prompt) ? "ar" : "en",
    direction: "auto",
    theme,
    nodes,
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
