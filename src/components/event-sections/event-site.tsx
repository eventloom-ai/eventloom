import { Fragment, type ReactNode } from "react";
import { DESIGN_STYLES, pickPalette } from "@/lib/event-design/styles";
import type { DesignedSection, EventSiteDesign } from "@/lib/event-design/types";
import { ClosingSection, GallerySection, GoodToKnowSection, RsvpSection, StorySection, TravelSection } from "./content-sections";
import { DetailsSection } from "./details";
import s from "./event-sections.module.css";
import { HeroSection } from "./hero";
import { ScheduleSection } from "./schedule";
import { cx } from "./shell";
import { siteVars, type SectionContext } from "./theme";

/** One designed section. Exported for the studio editor, which renders sections one Puck component at a time. */
export function DesignedSectionView({ section, ctx, rsvp }: { section: DesignedSection; ctx: SectionContext; rsvp: ReactNode }) {
  switch (section.kind) {
    case "hero": return <HeroSection section={section} ctx={ctx} />;
    case "details": return <DetailsSection section={section} ctx={ctx} />;
    case "schedule": return <ScheduleSection section={section} ctx={ctx} />;
    case "story": return <StorySection section={section} ctx={ctx} />;
    case "gallery": return <GallerySection section={section} ctx={ctx} />;
    case "goodToKnow": return <GoodToKnowSection section={section} ctx={ctx} />;
    case "travel": return <TravelSection section={section} ctx={ctx} />;
    case "rsvp": return <RsvpSection section={section} ctx={ctx}>{rsvp}</RsvpSection>;
    case "closing": return <ClosingSection section={section} ctx={ctx} />;
  }
}

/** Style, palette and section number for one section of a design (the hero is 0; content sections count from 1). */
export function sectionContext(design: EventSiteDesign, section: DesignedSection, embedded = false): SectionContext {
  const style = DESIGN_STYLES[design.styleKey];
  const contentSections = design.sections.filter((item) => item.kind !== "hero");
  return { style, palette: pickPalette(style, "", design.paletteKey), number: section.kind === "hero" ? 0 : contentSections.indexOf(section) + 1, embedded };
}

/** The wrapper every designed page shares: fonts, type scale, palette and text direction as CSS variables. */
export function EventSiteFrame({ design, className, children }: { design: Pick<EventSiteDesign, "styleKey" | "paletteKey" | "direction">; className?: string; children: ReactNode }) {
  const style = DESIGN_STYLES[design.styleKey];
  const palette = pickPalette(style, "", design.paletteKey);
  return (
    <div dir={design.direction} data-event-style={style.key} data-palette={palette.key} className={cx(s.site, className)} style={siteVars(style, palette)}>
      {children}
    </div>
  );
}

/**
 * Renders a designed event site. Server component; the only client code is whatever is passed as `rsvp`
 * (the shared RsvpForm on live pages). Section components never read EventConfig directly, only the
 * resolved props from designEventSite, so the same props can be edited in Puck.
 * `embedded` renders it as a preview inside another page (no h1 of its own).
 */
export function EventSite({ design, rsvp, className, embedded = false }: { design: EventSiteDesign; rsvp: ReactNode; className?: string; embedded?: boolean }) {
  return (
    <EventSiteFrame design={design} className={className}>
      {design.sections.map((section) => (
        <Fragment key={section.id}>
          <DesignedSectionView section={section} ctx={sectionContext(design, section, embedded)} rsvp={rsvp} />
        </Fragment>
      ))}
    </EventSiteFrame>
  );
}
