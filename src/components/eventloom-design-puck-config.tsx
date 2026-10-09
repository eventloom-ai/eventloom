import type { ReactNode } from "react";
import type { ComponentConfig, Config, Fields, PuckContext } from "@puckeditor/core";
import { DesignedSectionView, EventSiteFrame, sectionContext } from "@/components/event-sections/event-site";
import { RsvpForm } from "@/components/rsvp-form";
import { SECTION_VARIANTS, type SectionKey } from "@/lib/event-design/schema";
import { DESIGN_STYLES, STYLE_KEYS, isStyleKey } from "@/lib/event-design/styles";
import type { EventSiteDesign } from "@/lib/event-design/types";
import { DESIGN_COMPONENT_FOR_SECTION } from "@/lib/puck-design";
import type { EventConfig, EventStatus } from "@/lib/types";

/** What the studio passes as Puck metadata: the live config and the design resolved from the current editor data. */
export type DesignPuckMetadata = { config: EventConfig; site: EventSiteDesign | null; status: EventStatus };

const titleCase = (value: string) => value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

const SECTION_LABELS: Record<SectionKey, string> = {
  hero: "Opening",
  details: "When & where",
  story: "Story",
  schedule: "Schedule",
  gallery: "Gallery",
  goodToKnow: "Good to know",
  travel: "Travel & stay",
  rsvp: "RSVP",
  closing: "Closing",
};

const EMPTY_HINTS: Partial<Record<SectionKey, string>> = {
  story: "Add a heading and at least one paragraph to show your story.",
  gallery: "A gallery appears once the event has at least four photos.",
  goodToKnow: "Add at least two notes (a dress code counts as one) to show this section.",
  travel: "Add a hotel, transport or parking note to show this section.",
  schedule: "Add at least two schedule items in the page settings to show the schedule.",
};

function variantField(kind: SectionKey) {
  return {
    type: "select" as const,
    label: "Layout",
    options: [{ label: "Style default", value: "" }, ...SECTION_VARIANTS[kind].map((value) => ({ label: titleCase(value), value }))],
  };
}

const toneField = {
  type: "select" as const,
  label: "Background",
  options: [
    { label: "Automatic", value: "" },
    { label: "Page", value: "base" },
    { label: "Alternate", value: "alt" },
    { label: "Contrast", value: "inverse" },
  ],
};

const text = (label: string, placeholder = "Style default") => ({ type: "text" as const, label, placeholder });
const textarea = (label: string, placeholder = "") => ({ type: "textarea" as const, label, placeholder });

const CONTENT_FIELDS: Record<SectionKey, Fields> = {
  hero: { eyebrow: text("Line above the title") },
  details: { heading: text("Heading"), dressCode: text("Dress code", "Only if you have one") },
  story: { eyebrow: text("Label"), heading: text("Heading", ""), paragraphs: textarea("Story", "Separate paragraphs with a blank line"), signature: text("Signed", "") },
  schedule: { heading: text("Heading") },
  gallery: { heading: text("Heading") },
  goodToKnow: {
    heading: text("Heading"),
    items: { type: "array", label: "Notes", arrayFields: { title: text("Title", ""), body: textarea("Details") }, defaultItemProps: { title: "", body: "" }, getItemSummary: (item: { title?: string }) => item.title || "Note", max: 6 },
  },
  travel: {
    heading: text("Heading"),
    items: { type: "array", label: "Places & transport", arrayFields: { title: text("Title", ""), body: textarea("Details"), href: text("Link (https://…)", ""), linkLabel: text("Link label", "Details") }, defaultItemProps: { title: "", body: "", href: "", linkLabel: "" }, getItemSummary: (item: { title?: string }) => item.title || "Item", max: 4 },
  },
  rsvp: { heading: text("Heading"), description: textarea("Introduction", "Style default") },
  closing: { line: text("Closing line") },
};

function metadataOf(puck: PuckContext) {
  return puck.metadata as Partial<DesignPuckMetadata>;
}

function SectionPreview({ kind, puck }: { kind: SectionKey; puck: PuckContext }) {
  const { site, config, status } = metadataOf(puck);
  const section = site?.sections.find((item) => item.kind === kind);
  if (!site || !section || !config) {
    return (
      <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", border: "1px dashed rgb(0 0 0 / 0.25)", margin: "1rem", fontFamily: "var(--font-inter)", fontSize: "0.9rem", color: "#57534e", background: "#fafaf9" }}>
        <strong style={{ display: "block", color: "#1c1917" }}>{SECTION_LABELS[kind]}</strong>
        {EMPTY_HINTS[kind] ?? "This section is not shown on the page."}
      </div>
    );
  }
  const rsvp = kind === "rsvp" ? <RsvpForm hideHeader formToken="" turnstileSiteKey="" isOpen={false} isDraft={status === "draft"} fields={config.rsvpFields} /> : null;
  return <DesignedSectionView section={section} ctx={sectionContext(site, section)} rsvp={rsvp} />;
}

function sectionComponent(kind: SectionKey): ComponentConfig {
  const required = kind === "hero" || kind === "rsvp";
  return {
    label: SECTION_LABELS[kind],
    fields: { variant: variantField(kind), tone: toneField, ...CONTENT_FIELDS[kind] },
    defaultProps: { variant: "", tone: "", ...Object.fromEntries(Object.entries(CONTENT_FIELDS[kind]).map(([key, field]) => [key, field.type === "array" ? [] : ""])) },
    // A section is one block of the page: it can be moved or hidden, never duplicated; the opening and RSVP always stay.
    permissions: { duplicate: false, ...(required ? { delete: false } : {}) },
    render: ({ puck }) => <SectionPreview kind={kind} puck={puck} />,
  };
}

const paletteOptions = (styleKey: unknown) => {
  const style = DESIGN_STYLES[typeof styleKey === "string" && isStyleKey(styleKey) ? styleKey : "editorial"];
  return style.palettes.map((palette) => ({ label: palette.name, value: palette.key }));
};

const rootFields: Fields = {
  styleKey: { type: "select", label: "Style", options: STYLE_KEYS.map((key) => ({ label: DESIGN_STYLES[key].name, value: key })) },
  paletteKey: { type: "select", label: "Palette", options: paletteOptions("editorial") },
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
    getItemSummary: (item: { title?: string; time?: string }) => [item.time, item.title].filter(Boolean).join(" · ") || "Item",
    max: 30,
  },
};

/**
 * Puck config for designed events: the page is the approved section library, one component per section kind.
 * Hosts pick layouts and backgrounds from closed sets and edit copy; colors, fonts and spacing come from the style.
 */
export function createDesignPuckConfig(): Config {
  const components = Object.fromEntries((Object.keys(DESIGN_COMPONENT_FOR_SECTION) as SectionKey[]).map((kind) => [DESIGN_COMPONENT_FOR_SECTION[kind], sectionComponent(kind)]));
  return {
    categories: { sections: { title: "Sections", components: Object.values(DESIGN_COMPONENT_FOR_SECTION), defaultExpanded: true } },
    root: {
      fields: rootFields,
      // The palette list follows the chosen style.
      resolveFields: (data: { props?: Record<string, unknown> }, { fields }: { fields: Fields }) => ({ ...fields, paletteKey: { type: "select", label: "Palette", options: paletteOptions(data.props?.styleKey) } }),
      render: ({ children, puck, ...props }: { children: ReactNode; puck: PuckContext } & Record<string, unknown>) => {
        const site = metadataOf(puck).site;
        const styleKey = typeof props.styleKey === "string" && isStyleKey(props.styleKey) ? props.styleKey : site?.styleKey ?? "editorial";
        const paletteKey = typeof props.paletteKey === "string" ? props.paletteKey : site?.paletteKey ?? "";
        return <EventSiteFrame design={{ styleKey, paletteKey, direction: site?.direction ?? "ltr" }} className="min-h-full">{children}</EventSiteFrame>;
      },
    },
    components,
  } as Config;
}
