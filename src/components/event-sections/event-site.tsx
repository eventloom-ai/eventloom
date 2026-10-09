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

function renderSection(section: DesignedSection, ctx: SectionContext, rsvp: ReactNode) {
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

/**
 * Renders a designed event site. Server component; the only client code is whatever is passed as `rsvp`
 * (the shared RsvpForm on live pages). Section components never read EventConfig directly, only the
 * resolved props from designEventSite, so the same props can later be edited in Puck.
 */
export function EventSite({ design, rsvp, className }: { design: EventSiteDesign; rsvp: ReactNode; className?: string }) {
  const style = DESIGN_STYLES[design.styleKey];
  const palette = pickPalette(style, "", design.paletteKey);
  let number = 0;
  return (
    <div dir={design.direction} data-event-style={style.key} data-palette={palette.key} className={cx(s.site, className)} style={siteVars(style, palette)}>
      {design.sections.map((section) => {
        const ctx: SectionContext = { style, palette, number: section.kind === "hero" ? 0 : ++number };
        return <Fragment key={section.id}>{renderSection(section, ctx, rsvp)}</Fragment>;
      })}
    </div>
  );
}
