import { z } from "zod";
import { findSiteNode, siteDocumentSchema, type SiteDocument, type SiteNode, type SiteStyle } from "@/lib/site-document";
import type { EventConfig } from "@/lib/types";

const stylePatchSchema = z.object({
  background: z.string().max(120).nullable().optional(),
  color: z.string().max(120).nullable().optional(),
  accent: z.string().max(120).nullable().optional(),
  align: z.enum(["left", "center", "right"]).nullable().optional(),
  width: z.enum(["full", "wide", "content", "narrow"]).nullable().optional(),
  padding: z.enum(["none", "small", "medium", "large", "hero"]).nullable().optional(),
  gap: z.enum(["none", "small", "medium", "large"]).nullable().optional(),
  radius: z.enum(["none", "small", "medium", "large", "pill"]).nullable().optional(),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable().optional(),
  minHeight: z.enum(["auto", "screen", "threeQuarter", "half"]).nullable().optional(),
  font: z.enum(["display", "body", "mono"]).nullable().optional(),
  size: z.enum(["xs", "sm", "md", "lg", "xl", "hero"]).nullable().optional(),
  weight: z.enum(["regular", "medium", "semibold", "bold"]).nullable().optional(),
  hidden: z.boolean().nullable().optional(),
}).strict();

export const siteOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("replace_text"), nodeId: z.string(), content: z.string().max(4000) }).strict(),
  z.object({ op: z.literal("update_style"), nodeId: z.string(), style: stylePatchSchema }).strict(),
  z.object({ op: z.literal("set_theme"), colors: z.object({ text: z.string().optional(), surface: z.string().optional(), accent: z.string().optional(), muted: z.string().optional() }).strict().optional(), display: z.enum(["editorial", "romantic", "modern", "playful"]).optional(), body: z.enum(["clean", "humanist", "geometric"]).optional(), radius: z.enum(["sharp", "soft", "round"]).optional(), motion: z.enum(["none", "subtle", "expressive"]).optional() }).strict(),
  z.object({ op: z.literal("remove_node"), nodeId: z.string() }).strict(),
  z.object({ op: z.literal("move_node"), nodeId: z.string(), beforeNodeId: z.string().nullable() }).strict(),
  z.object({ op: z.literal("set_image"), nodeId: z.string(), url: z.string().max(2048), alt: z.string().max(300).optional() }).strict(),
]);

export type SiteOperation = z.infer<typeof siteOperationSchema>;
export const siteOperationsSchema = z.array(siteOperationSchema).min(1).max(30);

export const eventDetailsPatchSchema = z.object({
  title: z.string().min(1).max(180).optional(),
  subtitle: z.string().min(1).max(600).optional(),
  date: z.string().max(180).optional(),
  venueName: z.string().max(180).optional(),
  venueAddress: z.string().max(300).optional(),
  rsvpDeadline: z.string().max(180).optional(),
  schedule: z.array(z.object({ title: z.string().min(1).max(180), time: z.string().min(1).max(120), location: z.string().max(180).optional(), description: z.string().max(600).optional() }).strict()).max(30).optional(),
  rsvpFields: z.array(z.enum(["name", "attendance", "party_size", "guest_names", "email", "phone", "meal_preference", "note"])).min(2).max(8).optional(),
}).strict();

type NodeContainer = { nodes: SiteNode[]; index: number };

function findContainer(document: SiteDocument, nodeId: string): NodeContainer | null {
  const search = (nodes: SiteNode[]): NodeContainer | null => {
    const index = nodes.findIndex((node) => node.id === nodeId);
    if (index >= 0) return { nodes, index };
    for (const node of nodes) {
      if ("children" in node) {
        const result = search(node.children);
        if (result) return result;
      }
    }
    return null;
  };
  return search(document.nodes);
}

function cleanStylePatch(style: z.infer<typeof stylePatchSchema>) {
  return Object.fromEntries(Object.entries(style).filter(([, value]) => value !== null)) as SiteStyle;
}

export function applySiteOperations(input: SiteDocument, rawOperations: unknown) {
  const operations = siteOperationsSchema.parse(rawOperations);
  const document = structuredClone(input);
  const changedNodeIds = new Set<string>();

  for (const operation of operations) {
    if (operation.op === "set_theme") {
      document.theme = {
        ...document.theme,
        colors: { ...document.theme.colors, ...operation.colors },
        typography: {
          display: operation.display ?? document.theme.typography.display,
          body: operation.body ?? document.theme.typography.body,
        },
        radius: operation.radius ?? document.theme.radius,
        motion: operation.motion ?? document.theme.motion,
      };
      continue;
    }

    const node = findSiteNode(document, operation.nodeId);
    if (!node) throw new Error(`node_not_found:${operation.nodeId}`);
    changedNodeIds.add(node.id);

    if (operation.op === "replace_text") {
      if (node.type !== "text") throw new Error(`node_not_text:${node.id}`);
      node.content = operation.content;
      delete node.binding;
    } else if (operation.op === "update_style") {
      const removed = Object.entries(operation.style).filter(([, value]) => value === null).map(([key]) => key as keyof SiteStyle);
      node.style = { ...(node.style ?? {}), ...cleanStylePatch(operation.style) };
      removed.forEach((key) => delete node.style?.[key]);
    } else if (operation.op === "set_image") {
      if (node.type !== "image") throw new Error(`node_not_image:${node.id}`);
      node.url = operation.url;
      if (operation.alt) node.alt = operation.alt;
    } else if (operation.op === "remove_node") {
      const container = findContainer(document, node.id);
      if (!container) throw new Error(`node_not_found:${node.id}`);
      container.nodes.splice(container.index, 1);
    } else if (operation.op === "move_node") {
      const source = findContainer(document, node.id);
      if (!source) throw new Error(`node_not_found:${node.id}`);
      const [moving] = source.nodes.splice(source.index, 1);
      if (!moving) throw new Error(`node_not_found:${node.id}`);
      if (!operation.beforeNodeId) {
        document.nodes.push(moving);
      } else {
        const target = findContainer(document, operation.beforeNodeId);
        if (!target) throw new Error(`node_not_found:${operation.beforeNodeId}`);
        target.nodes.splice(target.index, 0, moving);
      }
    }
  }

  return { document: siteDocumentSchema.parse(document), changedNodeIds: [...changedNodeIds] };
}

export function applyEventDetailsPatch(config: EventConfig, rawPatch: unknown) {
  return { ...config, ...eventDetailsPatchSchema.parse(rawPatch) };
}
