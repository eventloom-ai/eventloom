import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Config, PuckContext } from "@puckeditor/core";
import { RsvpForm } from "@/components/rsvp-form";
import { siteBindingValue, siteDocumentShellStyle, siteStyleToCss } from "@/components/site-document-renderer";
import { puckPropsToSiteStyle } from "@/lib/puck-document";
import type { SiteDocument, SiteTextBinding } from "@/lib/site-document";
import type { EventConfig, EventStatus } from "@/lib/types";

type RenderContext = {
  document: SiteDocument;
  config: EventConfig;
  status: EventStatus;
  rsvpOpen: boolean;
  formToken?: string;
  turnstileSiteKey?: string;
};

function currentConfig(puck: PuckContext, fallback: EventConfig) {
  return (puck.metadata.config as EventConfig | undefined) ?? fallback;
}

const select = (values: readonly string[]) => ({
  type: "select" as const,
  options: values.map((value) => ({ label: value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()), value })),
});

const commonStyleFields = {
  background: { type: "text" as const, label: "Background", placeholder: "#ffffff or a CSS background" },
  color: { type: "text" as const, label: "Text color", placeholder: "#111111" },
  align: { ...select(["left", "center", "right"]), label: "Alignment" },
  width: { ...select(["full", "wide", "content", "narrow"]), label: "Width" },
  padding: { ...select(["none", "small", "medium", "large", "hero"]), label: "Spacing" },
  gap: { ...select(["none", "small", "medium", "large"]), label: "Gap" },
  radius: { ...select(["none", "small", "medium", "large", "pill"]), label: "Corners" },
  texture: { ...select(["none", "paper", "grain", "linen", "wash"]), label: "Texture" },
  border: { ...select(["none", "hairline", "thick"]), label: "Border" },
  justify: { ...select(["start", "center", "end"]), label: "Vertical position" },
  rotate: { ...select(["none", "left", "right"]), label: "Rotation" },
  offset: { ...select(["none", "raised", "lowered"]), label: "Offset" },
};

function componentStyle(props: Record<string, unknown>, document: SiteDocument) {
  return { ...siteStyleToCss(puckPropsToSiteStyle(props), document), transition: "var(--event-transition)" };
}

function layoutFields() {
  return {
    label: { type: "text" as const, label: "Section name" },
    ...commonStyleFields,
    content: { type: "slot" as const, label: "Content" },
  };
}

function rootDocument(props: Record<string, unknown>, base: SiteDocument): SiteDocument {
  return {
    ...base,
    locale: typeof props.locale === "string" ? props.locale : base.locale,
    direction: props.direction === "ltr" || props.direction === "rtl" || props.direction === "auto" ? props.direction : base.direction,
    theme: {
      colors: {
        text: typeof props.textColor === "string" ? props.textColor : base.theme.colors.text,
        surface: typeof props.surfaceColor === "string" ? props.surfaceColor : base.theme.colors.surface,
        accent: typeof props.accentColor === "string" ? props.accentColor : base.theme.colors.accent,
        muted: typeof props.mutedColor === "string" ? props.mutedColor : base.theme.colors.muted,
      },
      typography: {
        display: (typeof props.displayFont === "string" ? props.displayFont : base.theme.typography.display) as SiteDocument["theme"]["typography"]["display"],
        body: (typeof props.bodyFont === "string" ? props.bodyFont : base.theme.typography.body) as SiteDocument["theme"]["typography"]["body"],
      },
      radius: (typeof props.radius === "string" ? props.radius : base.theme.radius) as SiteDocument["theme"]["radius"],
      motion: (typeof props.motion === "string" ? props.motion : base.theme.motion) as SiteDocument["theme"]["motion"],
      texture: (typeof props.texture === "string" ? props.texture : base.theme.texture) as SiteDocument["theme"]["texture"],
    },
  };
}

function shellStyle(document: SiteDocument): CSSProperties {
  const display = document.theme.typography.display === "modern" ? "var(--font-geist-sans)" : document.theme.typography.display === "playful" ? "var(--font-inter)" : "var(--font-playfair)";
  const body = document.theme.typography.body === "geometric" ? "var(--font-geist-sans)" : "var(--font-inter)";
  return {
    ...siteDocumentShellStyle(document),
    "--event-display": display,
    "--event-body": body,
    "--event-accent": document.theme.colors.accent,
    "--event-surface": document.theme.colors.surface,
    "--event-transition": document.theme.motion === "none" ? "none" : "color 180ms ease, background 180ms ease, transform 180ms ease",
  } as CSSProperties;
}

export function createEventloomPuckConfig(context: RenderContext): Config {
  const { document, config } = context;
  return {
    categories: {
      layout: { title: "Layout", components: ["Section", "Stack", "Grid", "Overlay"], defaultExpanded: true },
      content: { title: "Content", components: ["Text", "Image", "Button", "Divider", "Gallery"] },
      event: { title: "Event", components: ["Countdown", "Schedule", "Venue", "Rsvp"] },
    },
    root: {
      fields: {
        eventTitle: { type: "text", label: "Event title" },
        eventSubtitle: { type: "textarea", label: "Introduction" },
        eventDate: { type: "text", label: "Date and time" },
        venueName: { type: "text", label: "Venue" },
        venueAddress: { type: "text", label: "Venue address" },
        rsvpDeadline: { type: "text", label: "RSVP deadline" },
        schedule: {
          type: "array",
          label: "Schedule",
          arrayFields: {
            time: { type: "text", label: "Time" },
            title: { type: "text", label: "Title" },
            location: { type: "text", label: "Location" },
            description: { type: "textarea", label: "Description" },
          },
          defaultItemProps: { time: "Time to be announced", title: "New schedule item", location: "", description: "" },
          max: 30,
        },
        locale: { type: "text", label: "Language" },
        direction: { ...select(["auto", "ltr", "rtl"]), label: "Text direction" },
        textColor: { type: "text", label: "Text color" },
        surfaceColor: { type: "text", label: "Page background" },
        accentColor: { type: "text", label: "Accent color" },
        mutedColor: { type: "text", label: "Muted color" },
        displayFont: { ...select(["editorial", "romantic", "modern", "playful", "bold", "vintage", "elegant", "condensed"]), label: "Display type" },
        bodyFont: { ...select(["clean", "humanist", "geometric", "serif", "warm"]), label: "Body type" },
        radius: { ...select(["sharp", "soft", "round"]), label: "Corner style" },
        motion: { ...select(["none", "subtle", "expressive"]), label: "Motion" },
        texture: { ...select(["none", "paper", "grain", "linen", "wash"]), label: "Page texture" },
      },
      render: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => {
        const liveDocument = rootDocument(props as Record<string, unknown>, document);
        return <main className="eventloom-site-document" dir={liveDocument.direction} style={shellStyle(liveDocument)}>{children}</main>;
      },
    },
    components: {
      Section: {
        label: "Section",
        fields: layoutFields(),
        defaultProps: { label: "New section", padding: "large", width: "wide", gap: "medium", content: [] },
        render: ({ content: Content, ...props }) => <section style={componentStyle(props, document)}><Content style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} /></section>,
      },
      Stack: {
        label: "Stack",
        fields: layoutFields(),
        defaultProps: { label: "Stack", gap: "medium", content: [] },
        render: ({ content: Content, ...props }) => <div style={componentStyle(props, document)}><Content style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} /></div>,
      },
      Grid: {
        label: "Grid",
        fields: { ...layoutFields(), columns: { type: "number", label: "Columns", min: 1, max: 4 } },
        defaultProps: { label: "Grid", columns: 2, gap: "medium", content: [] },
        render: ({ content: Content, columns, ...props }) => <div style={componentStyle({ ...props, columns }, document)}><Content style={{ display: "grid", gridTemplateColumns: `repeat(${Number(columns) || 2}, minmax(0, 1fr))`, gap: "1.5rem" }} /></div>,
      },
      Overlay: {
        label: "Overlay",
        fields: layoutFields(),
        defaultProps: { label: "Overlay", content: [] },
        render: ({ content: Content, ...props }) => <div style={componentStyle(props, document)}><Content /></div>,
      },
      Text: {
        label: "Text",
        fields: {
          content: { type: "textarea", label: "Text", contentEditable: true },
          binding: { type: "select", label: "Event detail", options: [
            { label: "Custom text", value: "" },
            { label: "Event title", value: "event.title" },
            { label: "Introduction", value: "event.subtitle" },
            { label: "Date", value: "event.date" },
            { label: "Venue", value: "event.venueName" },
            { label: "Venue address", value: "event.venueAddress" },
          ] },
          variant: { ...select(["eyebrow", "heading", "subheading", "body", "caption", "quote"]), label: "Text role" },
          font: { ...select(["display", "body", "mono"]), label: "Typeface" },
          size: { ...select(["xs", "sm", "md", "lg", "xl", "hero"]), label: "Size" },
          weight: { ...select(["regular", "medium", "semibold", "bold"]), label: "Weight" },
          align: { ...select(["left", "center", "right"]), label: "Alignment" },
          color: { type: "text", label: "Color" },
          letterSpacing: { ...select(["tight", "normal", "wide", "widest"]), label: "Letter spacing" },
          italic: { type: "radio", label: "Italic", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
          opacity: { ...select(["full", "muted", "faint"]), label: "Opacity" },
        },
        defaultProps: { content: "Add your text", binding: "", variant: "body", font: "body", size: "md", weight: "regular", align: "left" },
        render: ({ content, binding, variant, puck, ...props }) => {
          const liveConfig = currentConfig(puck, config);
          const value = content || siteBindingValue(binding as SiteTextBinding, liveConfig);
          const style = { margin: 0, ...componentStyle(props, document) };
          if (variant === "heading") return <h2 style={{ ...style, lineHeight: 0.98, letterSpacing: "-0.045em" }}>{value as ReactNode}</h2>;
          if (variant === "eyebrow") return <p style={{ ...style, textTransform: "uppercase", letterSpacing: "0.2em" }}>{value as ReactNode}</p>;
          if (variant === "caption") return <small style={{ ...style, lineHeight: 1.5 }}>{value as ReactNode}</small>;
          return <p style={{ ...style, lineHeight: variant === "subheading" ? 1.55 : 1.7 }}>{value as ReactNode}</p>;
        },
      },
      Image: {
        label: "Image",
        fields: { url: { type: "text", label: "Image URL" }, alt: { type: "text", label: "Description" }, fit: { ...select(["cover", "contain"]), label: "Fit" }, width: commonStyleFields.width, radius: commonStyleFields.radius },
        defaultProps: { url: "", alt: "Event image", fit: "cover", width: "wide", radius: "large" },
        render: ({ url, alt, fit, ...props }) => <figure style={{ overflow: "hidden", aspectRatio: "16 / 10", position: "relative", ...componentStyle(props, document) }}>{url ? <Image unoptimized fill sizes="(max-width: 768px) 100vw, 1200px" src={url} alt={alt || "Event image"} style={{ objectFit: fit || "cover" }} /> : <div style={{ display: "grid", minHeight: "18rem", placeItems: "center", background: "color-mix(in srgb, currentColor 8%, transparent)" }}>Choose an image</div>}</figure>,
      },
      Button: {
        label: "Button",
        fields: { label: { type: "text", label: "Label" }, href: { type: "text", label: "Link" }, variant: { ...select(["primary", "secondary", "ghost"]), label: "Style" }, align: commonStyleFields.align },
        defaultProps: { label: "Learn more", href: "#", variant: "primary", align: "left" },
        render: ({ label, href, variant, ...props }) => <a href={href || "#"} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.85rem 1.25rem", border: "1px solid currentColor", background: variant === "primary" ? "var(--event-accent)" : "transparent", color: variant === "primary" ? "var(--event-surface)" : "inherit", borderRadius: "0.75rem", textDecoration: "none", ...componentStyle(props, document) }}>{label}</a>,
      },
      Divider: { label: "Divider", fields: { dividerVariant: { ...select(["line", "ornament", "dot"]), label: "Style" } }, defaultProps: { dividerVariant: "line" }, render: (props) => <hr style={{ border: 0, borderTop: props.dividerVariant === "thick" ? "2px solid currentColor" : "1px solid currentColor", opacity: props.dividerVariant === "dot" ? 0.45 : 0.2, ...componentStyle(props, document) }} /> },
      Gallery: {
        label: "Gallery",
        fields: { images: { type: "array", label: "Photos", arrayFields: { id: { type: "text", label: "ID" }, url: { type: "text", label: "Image URL" }, alt: { type: "text", label: "Description" } }, defaultItemProps: (index: number) => ({ id: `gallery_${index}`, url: "", alt: "Event photo" }), max: 12 } },
        defaultProps: { images: [] },
        render: ({ images }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(13rem,1fr))", gap: "1rem" }}>{images?.filter((image: { url?: string }) => image.url).map((image: { id?: string; url: string; alt?: string }, index: number) => <div key={image.id || index} style={{ aspectRatio: "4 / 5", position: "relative", overflow: "hidden", borderRadius: "1rem" }}><Image unoptimized fill sizes="(max-width: 768px) 50vw, 30vw" src={image.url} alt={image.alt || "Event photo"} style={{ objectFit: "cover" }} /></div>)}</div>,
      },
      Countdown: { label: "Countdown", render: ({ puck }) => { const liveConfig = currentConfig(puck, config); return <div><p style={{ fontFamily: "var(--event-display)", fontSize: "clamp(2rem,5vw,4rem)" }}>{liveConfig.date}</p><p style={{ opacity: 0.65 }}>Save the date</p></div>; } },
      Schedule: { label: "Schedule", render: ({ puck }) => { const liveConfig = currentConfig(puck, config); return <div style={{ display: "grid", gap: "1rem" }}>{liveConfig.schedule.map((item) => <article key={`${item.title}-${item.time}`} style={{ display: "grid", gridTemplateColumns: "minmax(6rem,0.25fr) 1fr", gap: "1.5rem", paddingBlock: "1.25rem", borderTop: "1px solid color-mix(in srgb,currentColor 18%,transparent)" }}><p style={{ opacity: 0.65 }}>{item.time}</p><div><h3 style={{ fontSize: "1.25rem" }}>{item.title}</h3>{item.location ? <p style={{ marginTop: "0.35rem", opacity: 0.7 }}>{item.location}</p> : null}{item.description ? <p style={{ marginTop: "0.6rem", lineHeight: 1.6, opacity: 0.75 }}>{item.description}</p> : null}</div></article>)}</div>; } },
      Venue: { label: "Venue", fields: { showMap: { type: "radio", label: "Directions", options: [{ label: "Show", value: true }, { label: "Hide", value: false }] } }, defaultProps: { showMap: true }, render: ({ showMap, puck }) => { const liveConfig = currentConfig(puck, config); return <div><h3 style={{ fontFamily: "var(--event-display)", fontSize: "clamp(1.8rem,4vw,3.5rem)" }}>{liveConfig.venueName}</h3>{liveConfig.venueAddress ? <p style={{ marginTop: "0.75rem", opacity: 0.75 }}>{liveConfig.venueAddress}</p> : null}{showMap && liveConfig.venueName ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${liveConfig.venueName} ${liveConfig.venueAddress ?? ""}`)}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "1.5rem", color: "inherit" }}>Open directions ↗</a> : null}</div>; } },
      Rsvp: {
        label: "RSVP",
        permissions: { delete: false, duplicate: false, insert: false },
        fields: { heading: { type: "text", label: "Heading", contentEditable: true }, description: { type: "textarea", label: "Introduction", contentEditable: true } },
        defaultProps: { heading: "Will you join us?", description: "Please reply using the form below." },
        render: ({ heading, description, puck }) => { const liveConfig = currentConfig(puck, config); return <div><div style={{ maxWidth: "42rem", marginInline: "auto", marginBottom: "2rem", textAlign: "center" }}><h2 style={{ fontFamily: "var(--event-display)", fontSize: "clamp(2.4rem,6vw,5rem)", lineHeight: 1 }}>{heading}</h2>{description ? <p style={{ marginTop: "1rem", opacity: 0.7 }}>{description}</p> : null}</div><RsvpForm className="eventloom-managed-rsvp__form" formToken={context.formToken ?? ""} turnstileSiteKey={context.turnstileSiteKey ?? ""} isOpen={context.status === "published" && context.rsvpOpen && Boolean(context.formToken)} fields={liveConfig.rsvpFields} /></div>; },
      },
    },
  };
}
