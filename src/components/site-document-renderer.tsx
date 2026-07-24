import Image from "next/image";
import type { CSSProperties, FocusEvent, MouseEvent } from "react";
import { RsvpForm } from "@/components/rsvp-form";
import type { SiteDocument, SiteNode, SiteStyle, SiteTextBinding } from "@/lib/site-document";
import type { EventConfig, EventStatus } from "@/lib/types";

type SiteDocumentRendererProps = {
  document: SiteDocument;
  config: EventConfig;
  eventId?: string;
  slug?: string;
  status: EventStatus;
  rsvpOpen: boolean;
  formToken?: string;
  turnstileSiteKey?: string;
  referralHref?: string;
  selectedNodeId?: string | null;
  interactive?: boolean;
  onSelectNode?: (nodeId: string) => void;
  onTextCommit?: (nodeId: string, content: string) => void;
};

const padding = { none: "0", small: "clamp(1.5rem,4vw,3rem)", medium: "clamp(3rem,7vw,6rem)", large: "clamp(5rem,10vw,9rem)", hero: "clamp(6rem,14vw,13rem)" } as const;
const gap = { none: "0", small: "0.75rem", medium: "1.5rem", large: "3rem" } as const;
const radius = { none: "0", small: "0.5rem", medium: "1rem", large: "2rem", pill: "999px" } as const;
const maxWidth = { full: "none", wide: "80rem", content: "64rem", narrow: "42rem" } as const;
const minHeight = { auto: undefined, screen: "100svh", threeQuarter: "75svh", half: "50svh" } as const;
const fontSize = { xs: "0.75rem", sm: "0.875rem", md: "1rem", lg: "clamp(1.1rem,2vw,1.4rem)", xl: "clamp(2.4rem,6vw,5.5rem)", hero: "clamp(3rem,6vw,6rem)" } as const;
const fontWeight = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;

function styleFor(style: SiteStyle | undefined, document: SiteDocument): CSSProperties {
  if (!style) return {};
  return {
    background: style.background,
    color: style.color,
    textAlign: style.align,
    maxWidth: style.width ? maxWidth[style.width] : undefined,
    padding: style.padding ? `${padding[style.padding]} clamp(1.25rem,5vw,5rem)` : undefined,
    gap: style.gap ? gap[style.gap] : undefined,
    borderRadius: style.radius ? radius[style.radius] : undefined,
    gridTemplateColumns: style.columns ? `repeat(${style.columns}, minmax(0, 1fr))` : undefined,
    minHeight: style.minHeight ? minHeight[style.minHeight] : undefined,
    fontFamily: style.font === "display" ? "var(--event-display)" : style.font === "mono" ? "var(--font-geist-mono)" : "var(--event-body)",
    fontSize: style.size ? fontSize[style.size] : undefined,
    fontWeight: style.weight ? fontWeight[style.weight] : undefined,
    display: style.hidden ? "none" : undefined,
    marginInline: style.width && style.width !== "full" ? "auto" : undefined,
    width: style.width ? "100%" : undefined,
    transition: document.theme.motion === "none" ? undefined : "color 180ms ease, background 180ms ease, transform 180ms ease",
  };
}

function bindingValue(binding: SiteTextBinding | undefined, config: EventConfig) {
  if (!binding) return "";
  const key = binding.split(".")[1] as keyof EventConfig;
  const value = config[key];
  return typeof value === "string" ? value : "";
}

function NodeView({ node, context }: { node: SiteNode; context: SiteDocumentRendererProps }) {
  const { document, config, interactive, selectedNodeId, onSelectNode, onTextCommit } = context;
  const selected = selectedNodeId === node.id;
  const isImageLessHero = node.type === "section" && node.label === "Hero" && !node.children.some((child) => child.type === "image");
  const baseStyle = styleFor(node.style, document);
  const style: CSSProperties = isImageLessHero
    ? { ...baseStyle, padding: "clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 5rem)", minHeight: "auto", gap: "1.5rem" }
    : baseStyle;
  const common = {
    "data-site-node-id": node.id,
    "data-site-node-type": node.type,
    onClick: interactive ? (event: MouseEvent<HTMLElement>) => { event.stopPropagation(); onSelectNode?.(node.id); } : undefined,
    style: { ...style, outline: selected ? `2px solid ${document.theme.colors.accent}` : undefined, outlineOffset: selected ? "3px" : undefined, cursor: interactive ? "pointer" : undefined } as CSSProperties,
  };

  if (node.type === "section") return <section {...common} style={{ display: "flex", flexDirection: "column", gap: common.style.gap ?? "1.5rem", ...common.style }}>{node.children.map((child) => <NodeView key={child.id} node={child} context={context} />)}</section>;
  if (node.type === "stack") return <div {...common} style={{ display: "flex", flexDirection: "column", ...common.style }}>{node.children.map((child) => <NodeView key={child.id} node={child} context={context} />)}</div>;
  if (node.type === "grid") return <div {...common} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,18rem),1fr))", ...common.style }}>{node.children.map((child) => <NodeView key={child.id} node={child} context={context} />)}</div>;
  if (node.type === "overlay") return <div {...common} style={{ display: "grid", ...common.style }}>{node.children.map((child) => <div key={child.id} style={{ gridArea: "1 / 1" }}><NodeView node={child} context={context} /></div>)}</div>;
  if (node.type === "text") {
    const value = node.content ?? bindingValue(node.binding, config);
    const commit = interactive ? (event: FocusEvent<HTMLDivElement>) => {
      const content = event.currentTarget.innerText.trim();
      if (content && content !== value) onTextCommit?.(node.id, content);
    } : undefined;
    const editable = { contentEditable: interactive, suppressContentEditableWarning: true, onBlur: commit, title: interactive ? "Click to select, then type to edit" : undefined };
    const textStyle: CSSProperties = { margin: 0, ...common.style };
    if (node.variant === "heading") return <h2 {...common} {...editable} style={{ ...textStyle, lineHeight: 0.98, letterSpacing: "-0.045em", ...(node.style?.size === "hero" ? { maxWidth: "15ch", marginInline: node.style?.align === "center" ? "auto" : undefined, textWrap: "balance" } : {}) }}>{value}</h2>;
    if (node.variant === "subheading") return <p {...common} {...editable} style={{ ...textStyle, lineHeight: 1.55 }}>{value}</p>;
    if (node.variant === "eyebrow") return <p {...common} {...editable} style={{ ...textStyle, textTransform: "uppercase", letterSpacing: "0.2em" }}>{value}</p>;
    if (node.variant === "caption") return <small {...common} {...editable} style={{ ...textStyle, lineHeight: 1.5 }}>{value}</small>;
    return <p {...common} {...editable} style={{ ...textStyle, lineHeight: 1.7 }}>{value}</p>;
  }
  if (node.type === "image") return <figure {...common} style={{ overflow: "hidden", aspectRatio: "16 / 10", position: "relative", ...common.style }}>{node.url ? <Image unoptimized fill sizes="(max-width: 768px) 100vw, 1200px" src={node.url} alt={node.alt} style={{ objectFit: node.fit ?? "cover" }} /> : <div style={{ display: "grid", placeItems: "center", minHeight: "18rem", background: "color-mix(in srgb, currentColor 8%, transparent)" }}>Add an image</div>}</figure>;
  if (node.type === "button") return <a {...common} href={node.href} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.85rem 1.25rem", border: "1px solid currentColor", background: node.variant === "primary" ? document.theme.colors.accent : "transparent", color: node.variant === "primary" ? document.theme.colors.surface : "inherit", borderRadius: document.theme.radius === "round" ? "999px" : "0.75rem", textDecoration: "none", ...common.style }}>{node.label}</a>;
  if (node.type === "divider") return <hr {...common} style={{ border: 0, borderTop: "1px solid currentColor", opacity: 0.2, ...common.style }} />;
  if (node.type === "gallery") return <div {...common} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(13rem,1fr))", gap: "1rem", ...common.style }}>{node.images.map((image) => <div key={image.id} style={{ aspectRatio: "4 / 5", position: "relative", overflow: "hidden", borderRadius: "1rem" }}><Image unoptimized fill sizes="(max-width: 768px) 50vw, 30vw" src={image.url} alt={image.alt} style={{ objectFit: "cover" }} /></div>)}</div>;
  if (node.type === "countdown") return <div {...common}><p style={{ fontSize: "clamp(2rem,5vw,4rem)", fontFamily: "var(--event-display)" }}>{config.date}</p><p style={{ opacity: 0.65 }}>Save the date</p></div>;
  if (node.type === "schedule") return <div {...common} style={{ display: "grid", gap: "1rem", ...common.style }}>{config.schedule.map((item) => <article key={`${item.title}-${item.time}`} style={{ display: "grid", gridTemplateColumns: "minmax(6rem,0.25fr) 1fr", gap: "1.5rem", paddingBlock: "1.25rem", borderTop: "1px solid color-mix(in srgb,currentColor 18%,transparent)" }}><p style={{ opacity: 0.65 }}>{item.time}</p><div><h3 style={{ fontSize: "1.25rem" }}>{item.title}</h3>{item.location ? <p style={{ marginTop: "0.35rem", opacity: 0.7 }}>{item.location}</p> : null}{item.description ? <p style={{ marginTop: "0.6rem", lineHeight: 1.6, opacity: 0.75 }}>{item.description}</p> : null}</div></article>)}</div>;
  if (node.type === "venue") return <div {...common}><h3 style={{ fontSize: "clamp(1.8rem,4vw,3.5rem)", fontFamily: "var(--event-display)" }}>{config.venueName}</h3>{config.venueAddress ? <p style={{ marginTop: "0.75rem", opacity: 0.75 }}>{config.venueAddress}</p> : null}{node.showMap && config.venueName ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${config.venueName} ${config.venueAddress ?? ""}`)}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "1.5rem", color: "inherit" }}>Open directions ↗</a> : null}</div>;
  if (node.type === "rsvp") return <div {...common}><div style={{ maxWidth: "42rem", marginInline: "auto", marginBottom: "2rem", textAlign: "center" }}><h2 style={{ fontFamily: "var(--event-display)", fontSize: "clamp(2.4rem,6vw,5rem)", lineHeight: 1 }}>{node.heading ?? "Will you join us?"}</h2>{node.description ? <p style={{ marginTop: "1rem", opacity: 0.7 }}>{node.description}</p> : null}</div><RsvpForm className="eventloom-managed-rsvp__form" formToken={context.formToken ?? ""} turnstileSiteKey={context.turnstileSiteKey ?? ""} referralHref={context.referralHref} isOpen={context.status === "published" && context.rsvpOpen && Boolean(context.formToken)} fields={config.rsvpFields} /></div>;
  return null;
}

export function SiteDocumentRenderer(props: SiteDocumentRendererProps) {
  const { document } = props;
  const display = document.theme.typography.display === "modern" ? "var(--font-geist-sans)" : document.theme.typography.display === "playful" ? "var(--font-inter)" : "var(--font-playfair)";
  const body = document.theme.typography.body === "geometric" ? "var(--font-geist-sans)" : "var(--font-inter)";
  return (
    <main
      className="eventloom-site-document"
      dir={document.direction}
      style={{
        "--event-display": display,
        "--event-body": body,
        background: document.theme.colors.surface,
        color: document.theme.colors.text,
        minHeight: "100svh",
        fontFamily: body,
      } as CSSProperties}
    >
      {document.nodes.map((node) => <NodeView key={node.id} node={node} context={props} />)}
    </main>
  );
}
