import Image from "next/image";
import type { CSSProperties, FocusEvent, MouseEvent } from "react";
import { RsvpForm } from "@/components/rsvp-form";
import { SiteReveal } from "@/components/site-reveal";
import { backgroundLayers, prepareSiteDocument } from "@/lib/site-contrast";
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
  selectedNodeId?: string | null;
  interactive?: boolean;
  onSelectNode?: (nodeId: string) => void;
  onTextCommit?: (nodeId: string, content: string) => void;
};

const padding = { none: "0", small: "clamp(1.1rem,4cqw,2rem)", medium: "clamp(2rem,7cqw,4.5rem)", large: "clamp(3rem,9cqw,6.5rem)", hero: "clamp(3.25rem,11cqw,8rem)" } as const;
const gap = { none: "0", small: "0.85rem", medium: "1.75rem", large: "3.5rem" } as const;
const radius = { none: "0", small: "0.35rem", medium: "1rem", large: "2.25rem", pill: "999px" } as const;
const maxWidth = { full: "none", wide: "88rem", content: "68rem", narrow: "38rem" } as const;
const minHeight = { auto: undefined, screen: "100svh", threeQuarter: "78svh", half: "52svh" } as const;
const fontSize = { xs: "0.72rem", sm: "0.9rem", md: "1.05rem", lg: "clamp(1.05rem,3.2cqw,1.45rem)", xl: "clamp(1.8rem,7.5cqw,3.4rem)", hero: "clamp(2.35rem,11cqw,4.6rem)" } as const;
const fontWeight = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;
const letterSpacing = { tight: "-0.055em", normal: "-0.02em", wide: "0.12em", widest: "0.28em" } as const;
const opacity = { full: 1, muted: 0.78, faint: 0.64 } as const;
const displayFontVar = {
  editorial: "var(--font-playfair)",
  romantic: "var(--font-instrument-serif)",
  modern: "var(--font-space-grotesk)",
  playful: "var(--font-fraunces)",
  bold: "var(--font-bricolage-grotesque)",
  vintage: "var(--font-bodoni-moda)",
  elegant: "var(--font-italiana)",
  condensed: "var(--font-big-shoulders-display)",
} as const;
const bodyFontVar = {
  clean: "var(--font-inter)",
  humanist: "var(--font-work-sans)",
  geometric: "var(--font-outfit)",
  serif: "var(--font-newsreader)",
  warm: "var(--font-ibm-plex-sans)",
} as const;

function styleFor(style: SiteStyle | undefined, document: SiteDocument): CSSProperties {
  if (!style) return {};
  const horizontal = style.width === "full" && style.padding === "none" ? "0" : "clamp(1.2rem,5.5cqw,3.25rem)";
  const layout = Boolean(style.background || style.minHeight || style.columns);
  const surface = backgroundLayers(style.background, style.texture, style.accent ?? document.theme.colors.accent, document.theme.colors.surface);
  return {
    ...surface,
    color: style.color,
    textAlign: style.align,
    maxWidth: style.width ? maxWidth[style.width] : undefined,
    padding: style.padding ? `${padding[style.padding]} ${horizontal}` : undefined,
    gap: style.gap ? gap[style.gap] : undefined,
    borderRadius: style.radius ? radius[style.radius] : undefined,
    gridTemplateColumns: style.columns ? `repeat(${style.columns}, minmax(0, 1fr))` : undefined,
    minHeight: style.minHeight ? minHeight[style.minHeight] : undefined,
    fontFamily: style.font === "display" ? "var(--event-display)" : style.font === "mono" ? "var(--font-geist-mono)" : style.font === "body" ? "var(--event-body)" : undefined,
    fontSize: style.size ? fontSize[style.size] : undefined,
    fontWeight: style.weight ? fontWeight[style.weight] : undefined,
    fontStyle: style.italic ? "italic" : undefined,
    letterSpacing: style.letterSpacing ? letterSpacing[style.letterSpacing] : undefined,
    opacity: style.opacity && !layout ? opacity[style.opacity] : undefined,
    border: style.border === "hairline" ? "1px solid color-mix(in srgb, currentColor 18%, transparent)" : style.border === "thick" ? "2px solid currentColor" : undefined,
    justifyContent: style.justify === "center" ? "center" : style.justify === "end" ? "flex-end" : style.justify === "start" ? "flex-start" : undefined,
    display: style.hidden ? "none" : undefined,
    marginInline: style.width && style.width !== "full" ? "auto" : undefined,
    width: style.width ? "100%" : undefined,
    boxSizing: "border-box",
    transition: document.theme.motion === "none" ? undefined : "color 220ms ease, background 220ms ease, transform 220ms ease",
  };
}

function coupleHeading(value: string) {
  if (value.includes("\n")) return value;
  const parts = value.split(/\s*&\s*|\s+and\s+/i).map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[0]}\n&\n${parts[1]}` : value;
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
  const style = styleFor(node.style, document);
  const common = {
    "data-site-node-id": node.id,
    "data-site-node-type": node.type,
    onClick: interactive ? (event: MouseEvent<HTMLElement>) => { event.stopPropagation(); onSelectNode?.(node.id); } : undefined,
    style: { ...style, outline: selected ? `2px solid ${document.theme.colors.accent}` : undefined, outlineOffset: selected ? "4px" : undefined, cursor: interactive ? "pointer" : undefined } as CSSProperties,
  };

  if (node.type === "section") return <section {...common} style={{ display: "flex", flexDirection: "column", gap: common.style.gap ?? "1.75rem", ...common.style }}>{node.children.map((child) => <NodeView key={child.id} node={child} context={context} />)}</section>;
  if (node.type === "stack") return <div {...common} style={{ display: "flex", flexDirection: "column", ...common.style }}>{node.children.map((child) => <NodeView key={child.id} node={child} context={context} />)}</div>;
  if (node.type === "grid") {
    const columns = !node.style?.columns
      ? "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))"
      : node.style.columns === 1
        ? "1fr"
        : `repeat(auto-fit, minmax(min(100%, max(16rem, calc((100% - ${node.style.columns - 1} * 1.75rem) / ${node.style.columns}))), 1fr))`;
    return <div {...common} style={{ ...common.style, display: "grid", gridTemplateColumns: columns, alignItems: "stretch" }}>{node.children.map((child, index) => <SiteReveal key={child.id} motion={document.theme.motion} index={index}><NodeView node={child} context={context} /></SiteReveal>)}</div>;
  }
  if (node.type === "overlay") return (
    <div {...common} style={{ display: "grid", position: "relative", overflow: "hidden", ...common.style }}>
      {node.children.map((child, index) => (
        <SiteReveal key={child.id} motion={document.theme.motion} index={index} style={{ gridArea: "1 / 1", zIndex: index, minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: child.style?.justify === "end" ? "flex-end" : child.style?.justify === "center" ? "center" : "flex-start" }}>
          <NodeView node={child} context={context} />
        </SiteReveal>
      ))}
    </div>
  );
  if (node.type === "text") {
    const raw = node.content ?? bindingValue(node.binding, config);
    const value = node.variant === "heading" ? coupleHeading(raw) : raw;
    const commit = interactive ? (event: FocusEvent<HTMLDivElement>) => {
      const content = event.currentTarget.innerText.trim();
      if (content && content !== raw) onTextCommit?.(node.id, content);
    } : undefined;
    const editable = { contentEditable: interactive, suppressContentEditableWarning: true, onBlur: commit, title: interactive ? "Click to select, then type to edit" : undefined };
    const textStyle: CSSProperties = {
      ...common.style,
      margin: 0,
      width: "auto",
      maxWidth: "100%",
      whiteSpace: "pre-line",
      overflowWrap: "normal",
      wordBreak: "normal",
    };
    if (node.variant === "heading") return <h2 {...common} {...editable} style={{ ...textStyle, lineHeight: 0.95, letterSpacing: node.style?.letterSpacing ? letterSpacing[node.style.letterSpacing] : "-0.05em", textWrap: "balance" }}>{value}</h2>;
    if (node.variant === "subheading") return <p {...common} {...editable} style={{ ...textStyle, lineHeight: 1.55, maxWidth: "36rem" }}>{value}</p>;
    if (node.variant === "eyebrow") return <p {...common} {...editable} style={{ ...textStyle, textTransform: "uppercase", letterSpacing: node.style?.letterSpacing ? letterSpacing[node.style.letterSpacing] : "0.26em" }}>{value}</p>;
    if (node.variant === "caption") return <small {...common} {...editable} style={{ ...textStyle, display: "block", lineHeight: 1.5, letterSpacing: node.style?.letterSpacing ? letterSpacing[node.style.letterSpacing] : "0.08em", textTransform: "uppercase" }}>{value}</small>;
    return <p {...common} {...editable} style={{ ...textStyle, lineHeight: 1.7, maxWidth: "42rem" }}>{value}</p>;
  }
  if (node.type === "image") {
    if (!node.url && !interactive) return null;
    return <figure {...common} style={{ overflow: "hidden", aspectRatio: node.style?.minHeight ? undefined : "4 / 5", position: "relative", minHeight: node.url ? (node.style?.minHeight ? minHeight[node.style.minHeight] : "22rem") : "4.5rem", ...common.style }}>{node.url ? <Image unoptimized fill sizes="(max-width: 768px) 100vw, 1200px" src={node.url} alt={node.alt} style={{ objectFit: node.fit ?? "cover" }} /> : <div style={{ display: "grid", placeItems: "center", minHeight: "inherit", fontSize: "0.8rem", opacity: 0.55, border: "1px dashed color-mix(in srgb, currentColor 28%, transparent)" }}>Add an image</div>}</figure>;
  }
  if (node.type === "button") return <a {...common} href={node.href} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.95rem 1.4rem", border: "1px solid currentColor", background: node.variant === "primary" ? document.theme.colors.accent : "transparent", color: node.variant === "primary" ? document.theme.colors.surface : "inherit", borderRadius: document.theme.radius === "round" ? "999px" : document.theme.radius === "sharp" ? "0" : "0.85rem", textDecoration: "none", width: "fit-content", ...common.style }}>{node.label}</a>;
  if (node.type === "divider") return <hr {...common} style={{ border: 0, borderTop: "1px solid currentColor", opacity: 0.2, width: "100%", ...common.style }} />;
  if (node.type === "gallery") return <div {...common} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(13rem,1fr))", gap: "1rem", ...common.style }}>{node.images.map((image) => <div key={image.id} style={{ aspectRatio: "4 / 5", position: "relative", overflow: "hidden", borderRadius: document.theme.radius === "sharp" ? 0 : "1.25rem" }}><Image unoptimized fill sizes="(max-width: 768px) 50vw, 30vw" src={image.url} alt={image.alt} style={{ objectFit: "cover" }} /></div>)}</div>;
  if (node.type === "countdown") return <div {...common}><p style={{ fontSize: "clamp(1.8rem,8cqw,3.4rem)", fontFamily: "var(--event-display)", lineHeight: 0.95 }}>{config.date}</p><p style={{ opacity: 0.62, marginTop: "0.75rem", letterSpacing: "0.16em", textTransform: "uppercase", fontSize: "0.72rem" }}>Save the date</p></div>;
  if (node.type === "schedule") return <div {...common} style={{ display: "grid", gap: "0.25rem", ...common.style }}>{config.schedule.map((item) => <article key={`${item.title}-${item.time}`} style={{ display: "grid", gridTemplateColumns: "minmax(5.5rem,0.22fr) 1fr", gap: "1.75rem", paddingBlock: "1.4rem", borderTop: "1px solid color-mix(in srgb,currentColor 16%,transparent)" }}><p style={{ opacity: 0.58, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.75rem", paddingTop: "0.45rem" }}>{item.time}</p><div><h3 style={{ fontSize: "clamp(1.4rem,3vw,2.15rem)", fontFamily: "var(--event-display)", fontStyle: "italic", lineHeight: 1.05 }}>{item.title}</h3>{item.location ? <p style={{ marginTop: "0.4rem", opacity: 0.68 }}>{item.location}</p> : null}{item.description ? <p style={{ marginTop: "0.7rem", lineHeight: 1.65, opacity: 0.72, maxWidth: "36rem" }}>{item.description}</p> : null}</div></article>)}</div>;
  if (node.type === "venue") return <div {...common}><p style={{ fontSize: "clamp(1.7rem,7cqw,3.2rem)", fontFamily: "var(--event-display)", lineHeight: 1.02, letterSpacing: "-0.04em" }}>{config.venueName}</p>{config.venueAddress ? <p style={{ marginTop: "0.85rem", opacity: 0.7, maxWidth: "24rem" }}>{config.venueAddress}</p> : null}{node.showMap && config.venueName && !/to be announced/i.test(config.venueName) ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${config.venueName} ${config.venueAddress ?? ""}`)}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "1.5rem", color: "inherit", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.72rem" }}>Open directions ↗</a> : null}</div>;
  if (node.type === "rsvp") return (
    <div {...common}>
      <div style={{ maxWidth: "36rem", marginBottom: "2rem", textAlign: node.style?.align ?? "left" }}>
        <h2 style={{ fontFamily: "var(--event-display)", fontSize: "clamp(2.4rem,10cqw,4.4rem)", lineHeight: 0.95, fontStyle: "italic", letterSpacing: "-0.045em" }}>{node.heading ?? "Will you join us?"}</h2>
        {node.description ? <p style={{ marginTop: "1.15rem", opacity: 0.68, lineHeight: 1.6, maxWidth: "28rem" }}>{node.description}</p> : null}
      </div>
      <RsvpForm className="eventloom-managed-rsvp__form" formToken={context.formToken ?? ""} turnstileSiteKey={context.turnstileSiteKey ?? ""} isOpen={context.status === "published" && context.rsvpOpen && Boolean(context.formToken)} fields={config.rsvpFields} />
    </div>
  );
  return null;
}

export function SiteDocumentRenderer(props: SiteDocumentRendererProps) {
  const document = prepareSiteDocument(props.document);
  const context = { ...props, document };
  const display = displayFontVar[document.theme.typography.display];
  const body = bodyFontVar[document.theme.typography.body];
  const surface = backgroundLayers(document.theme.colors.surface, document.theme.texture, document.theme.colors.accent, document.theme.colors.surface);
  return (
    <main
      className="eventloom-site-document"
      dir={document.direction}
      style={{
        "--event-display": display,
        "--event-body": body,
        ...surface,
        color: document.theme.colors.text,
        minHeight: "100svh",
        fontFamily: body,
        containerType: "inline-size",
      } as CSSProperties}
    >
      {document.nodes.map((node, index) => <SiteReveal key={node.id} motion={document.theme.motion} index={index}><NodeView node={node} context={context} /></SiteReveal>)}
    </main>
  );
}
