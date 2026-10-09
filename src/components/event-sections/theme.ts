import type { CSSProperties } from "react";
import { contrastRatio } from "@/lib/site-contrast";
import type { DesignStyle, Palette, Tone } from "@/lib/event-design/styles";

export type SectionContext = {
  style: DesignStyle;
  palette: Palette;
  /** 1-based position among content sections (the hero is 0), for "No. 02" style indexes. */
  number: number;
};

/** Site-wide tokens: fonts, type scale, shape and spacing. Section tones layer their colors on top. */
export function siteVars(style: DesignStyle, palette: Palette): CSSProperties {
  const darkBase = contrastRatio(palette.tones.base.bg, "#000000") < 4;
  return {
    "--ev-display": style.fonts.display,
    "--ev-body": style.fonts.body,
    "--ev-label": style.fonts.label,
    "--ev-display-weight": String(style.type.displayWeight),
    "--ev-display-italic": style.type.displayItalic ? "italic" : "normal",
    "--ev-display-tracking": style.type.displayTracking,
    "--ev-display-leading": style.type.displayLeading,
    "--ev-display-case": style.type.displayCase,
    "--ev-label-tracking": style.type.labelTracking,
    "--ev-label-size": style.type.labelSize,
    "--ev-label-weight": String(style.type.labelWeight),
    "--ev-body-size": style.type.bodySize,
    "--ev-body-weight": String(style.type.bodyWeight),
    "--ev-wordmark-k": style.type.wordmark,
    "--ev-title-floor": String(style.type.titleFloor),
    "--ev-radius": style.shape.radius,
    "--ev-button-radius": style.shape.buttonRadius,
    "--ev-section-y": style.spacing.sectionY,
    "--ev-gutter": style.spacing.gutter,
    "--ev-measure": style.spacing.measure,
    "--ev-accent": palette.accent,
    "--ev-on-accent": palette.onAccent,
    "--ev-scrim": palette.scrim,
    "--ev-on-photo": palette.onPhoto,
    "--ev-pop-1": palette.pops[0] ?? palette.accent,
    "--ev-pop-2": palette.pops[1] ?? palette.accent,
    "--ev-pop-3": palette.pops[2] ?? palette.accent,
    "--ev-pop-4": palette.pops[3] ?? palette.accent,
    "--ev-pop-5": palette.pops[4] ?? palette.accent,
    // The RSVP form keeps its own dark text, so it always sits on a light card; on dark sites that card is ivory.
    "--ev-form-bg": darkBase ? palette.tones.inverse.card : "#ffffff",
    ...toneVars(palette, "base"),
  } as CSSProperties;
}

export function toneVars(palette: Palette, tone: Tone): CSSProperties {
  const colors = palette.tones[tone];
  return {
    "--ev-bg": colors.bg,
    "--ev-card": colors.card,
    "--ev-ink": colors.ink,
    "--ev-muted": colors.muted,
    "--ev-accent-text": colors.accentText,
    "--ev-line": colors.line,
  } as CSSProperties;
}
