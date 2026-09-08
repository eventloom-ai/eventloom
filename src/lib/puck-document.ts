import type { ComponentData, Data, UiState } from "@puckeditor/core";
import { siteDocumentSchema, type SiteDocument, type SiteNode, type SiteStyle } from "@/lib/site-document";
import { eventDetailsPatchSchema } from "@/lib/site-document-operations";
import type { EventConfig } from "@/lib/types";

const componentTypeForNode = {
  section: "Section",
  stack: "Stack",
  grid: "Grid",
  overlay: "Overlay",
  text: "Text",
  image: "Image",
  button: "Button",
  divider: "Divider",
  gallery: "Gallery",
  countdown: "Countdown",
  schedule: "Schedule",
  venue: "Venue",
  rsvp: "Rsvp",
} as const satisfies Record<SiteNode["type"], string>;

const nodeTypeForComponent = Object.fromEntries(
  Object.entries(componentTypeForNode).map(([nodeType, componentType]) => [componentType, nodeType]),
) as Record<string, SiteNode["type"]>;

const styleKeys = [
  "background",
  "color",
  "accent",
  "align",
  "width",
  "padding",
  "gap",
  "radius",
  "columns",
  "minHeight",
  "font",
  "size",
  "weight",
  "hidden",
  "texture",
  "letterSpacing",
  "italic",
  "opacity",
  "border",
  "justify",
  "rotate",
  "offset",
] as const satisfies readonly (keyof SiteStyle)[];

function styleProps(style: SiteStyle | undefined) {
  return Object.fromEntries(styleKeys.flatMap((key) => style?.[key] === undefined ? [] : [[key, style[key]]])) as Record<string, unknown>;
}

export function puckPropsToSiteStyle(props: Record<string, unknown>) {
  const style = Object.fromEntries(styleKeys.flatMap((key) => props[key] === undefined || props[key] === "" ? [] : [[key, props[key]]])) as SiteStyle;
  return Object.keys(style).length ? style : undefined;
}

function nodeToComponent(node: SiteNode): ComponentData {
  const common = { id: node.id, label: node.label ?? "", ...styleProps(node.style) };
  const type = componentTypeForNode[node.type];
  if ("children" in node) {
    return { type, props: { ...common, content: node.children.map(nodeToComponent) } };
  }
  if (node.type === "text") return { type, props: { ...common, content: node.content ?? "", binding: node.binding ?? "", variant: node.variant } };
  if (node.type === "image") return { type, props: { ...common, url: node.url ?? "", alt: node.alt, fit: node.fit ?? "cover" } };
  if (node.type === "button") return { type, props: { ...common, label: node.label, href: node.href, variant: node.variant ?? "primary" } };
  if (node.type === "divider") return { type, props: { ...common, dividerVariant: node.dividerVariant ?? "line" } };
  if (node.type === "gallery") return { type, props: { ...common, images: node.images } };
  if (node.type === "venue") return { type, props: { ...common, showMap: node.showMap ?? true } };
  if (node.type === "rsvp") return { type, props: { ...common, heading: node.heading ?? "Will you join us?", description: node.description ?? "" } };
  return { type, props: common };
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeId(value: unknown, type: SiteNode["type"]) {
  const normalized = safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .slice(0, 63);
  return normalized.length >= 3 ? normalized : `${type}_${Math.random().toString(36).slice(2, 12)}`;
}

function componentToNode(component: ComponentData): SiteNode {
  const props = component.props as Record<string, unknown>;
  const type = nodeTypeForComponent[component.type];
  if (!type) throw new Error(`unknown_component:${component.type}`);
  const common = {
    id: safeId(props.id, type),
    ...(safeString(props.label) ? { label: safeString(props.label) } : {}),
    ...(puckPropsToSiteStyle(props) ? { style: puckPropsToSiteStyle(props) } : {}),
  };
  if (type === "section" || type === "stack" || type === "grid" || type === "overlay") {
    const content = Array.isArray(props.content) ? props.content as ComponentData[] : [];
    return { ...common, type, children: content.map(componentToNode) };
  }
  if (type === "text") {
    const binding = safeString(props.binding) as Extract<SiteNode, { type: "text" }>["binding"];
    return {
      ...common,
      type,
      ...(safeString(props.content) ? { content: safeString(props.content) } : {}),
      ...(binding ? { binding } : {}),
      variant: safeString(props.variant, "body") as Extract<SiteNode, { type: "text" }>["variant"],
    };
  }
  if (type === "image") return { ...common, type, url: safeString(props.url) || undefined, alt: safeString(props.alt, "Event image"), fit: safeString(props.fit, "cover") as "cover" | "contain" };
  if (type === "button") return { ...common, type, label: safeString(props.label, "Learn more"), href: safeString(props.href, "#"), variant: safeString(props.variant, "primary") as "primary" | "secondary" | "ghost" };
  if (type === "divider") return { ...common, type, dividerVariant: safeString(props.dividerVariant, "line") as "line" | "ornament" | "dot" };
  if (type === "gallery") {
    const images = Array.isArray(props.images) ? props.images.flatMap((image, index) => {
      if (!image || typeof image !== "object") return [];
      const value = image as Record<string, unknown>;
      const url = safeString(value.url);
      return url ? [{ id: safeString(value.id, `gallery_${index}`), url, alt: safeString(value.alt, "Event photo") }] : [];
    }) : [];
    return { ...common, type, images };
  }
  if (type === "countdown" || type === "schedule") return { ...common, type };
  if (type === "venue") return { ...common, type, showMap: props.showMap !== false };
  return { ...common, type: "rsvp", heading: safeString(props.heading) || undefined, description: safeString(props.description) || undefined };
}

export function siteDocumentToPuckData(document: SiteDocument, config?: EventConfig): Data {
  return {
    root: {
      props: {
        locale: document.locale,
        direction: document.direction,
        textColor: document.theme.colors.text,
        surfaceColor: document.theme.colors.surface,
        accentColor: document.theme.colors.accent,
        mutedColor: document.theme.colors.muted,
        displayFont: document.theme.typography.display,
        bodyFont: document.theme.typography.body,
        radius: document.theme.radius,
        motion: document.theme.motion,
        texture: document.theme.texture ?? "none",
        ...(config ? {
          eventTitle: config.title,
          eventSubtitle: config.subtitle,
          eventDate: config.date,
          venueName: config.venueName,
          venueAddress: config.venueAddress ?? "",
          rsvpDeadline: config.rsvpDeadline ?? "",
          schedule: config.schedule,
        } : {}),
      },
    },
    content: document.nodes.map(nodeToComponent),
  } as unknown as Data;
}

export function puckDataToEventPatch(data: Data) {
  const root = ((data.root as { props?: Record<string, unknown> }).props ?? data.root) as Record<string, unknown>;
  const schedule = Array.isArray(root.schedule) ? root.schedule.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    const title = safeString(value.title).trim();
    const time = safeString(value.time).trim();
    return title && time ? [{ title, time, ...(safeString(value.location).trim() ? { location: safeString(value.location).trim() } : {}), ...(safeString(value.description).trim() ? { description: safeString(value.description).trim() } : {}) }] : [];
  }) : undefined;
  return eventDetailsPatchSchema.parse({
    ...(safeString(root.eventTitle).trim() ? { title: safeString(root.eventTitle).trim() } : {}),
    ...(safeString(root.eventSubtitle).trim() ? { subtitle: safeString(root.eventSubtitle).trim() } : {}),
    ...(typeof root.eventDate === "string" ? { date: root.eventDate } : {}),
    ...(typeof root.venueName === "string" ? { venueName: root.venueName } : {}),
    ...(typeof root.venueAddress === "string" ? { venueAddress: root.venueAddress } : {}),
    ...(typeof root.rsvpDeadline === "string" ? { rsvpDeadline: root.rsvpDeadline } : {}),
    ...(schedule ? { schedule } : {}),
  });
}

function contentForZone(data: Data, zone: string | undefined): ComponentData[] {
  if (!zone || zone === "root") return data.content;
  const separator = zone.lastIndexOf(":");
  if (separator < 0) return [];
  const parentId = zone.slice(0, separator);
  const propName = zone.slice(separator + 1);
  const visit = (content: ComponentData[]): ComponentData[] | null => {
    for (const component of content) {
      if (component.props.id === parentId) {
        const slot = (component.props as Record<string, unknown>)[propName];
        return Array.isArray(slot) ? slot as ComponentData[] : [];
      }
      for (const value of Object.values(component.props)) {
        if (!Array.isArray(value) || !value.every((item) => item && typeof item === "object" && "type" in item)) continue;
        const found = visit(value as ComponentData[]);
        if (found) return found;
      }
    }
    return null;
  };
  return visit(data.content) ?? [];
}

export function selectedPuckNodeId(data: Data, selector: UiState["itemSelector"]) {
  if (!selector) return null;
  return safeString(contentForZone(data, selector.zone)[selector.index]?.props.id) || null;
}

export function puckDataToSiteDocument(data: Data): SiteDocument {
  const root = ((data.root as { props?: Record<string, unknown> }).props ?? data.root) as Record<string, unknown>;
  return siteDocumentSchema.parse({
    schemaVersion: 2,
    locale: safeString(root.locale, "en"),
    direction: safeString(root.direction, "auto"),
    theme: {
      colors: {
        text: safeString(root.textColor, "#1f1a17"),
        surface: safeString(root.surfaceColor, "#fbf7f1"),
        accent: safeString(root.accentColor, "#9a5d55"),
        muted: safeString(root.mutedColor, "#747d6c"),
      },
      typography: {
        display: safeString(root.displayFont, "editorial"),
        body: safeString(root.bodyFont, "clean"),
      },
      radius: safeString(root.radius, "soft"),
      motion: safeString(root.motion, "subtle"),
      texture: safeString(root.texture, "none"),
    },
    nodes: data.content.map(componentToNode),
  });
}
