/**
 * Design families ("styles") for event sites. A style is a complete, tested identity: a font pairing,
 * a small set of palettes, shape/spacing/ornament rules, and which section variants it prefers.
 * The AI picks a style key and a palette key; it never invents colors, fonts or layout.
 *
 * Every palette is checked by src/lib/tests/event-design.test.ts for WCAG AA: ink, muted and accentText
 * reach 4.5:1 on both the tone's background and its card color, and onAccent reaches 4.5:1 on accent.
 */

export const STYLE_KEYS = ["editorial", "romantic", "minimal", "playful", "noir"] as const;
export type StyleKey = (typeof STYLE_KEYS)[number];

export const TONES = ["base", "alt", "inverse"] as const;
export type Tone = (typeof TONES)[number];

export type ToneColors = {
  bg: string;
  /** Cards and panels sitting on bg. */
  card: string;
  ink: string;
  /** Secondary text. AA on bg and card. */
  muted: string;
  /** Small accent-colored text (labels, times). AA on bg and card. */
  accentText: string;
  /** Decorative lines and ornaments only (never text). */
  line: string;
};

export type Palette = {
  key: string;
  name: string;
  tones: Record<Tone, ToneColors>;
  /** Button fills, large decorative marks. */
  accent: string;
  onAccent: string;
  /** Extra decorative colors (shapes, stickers). Never used for text. */
  pops: string[];
  /** RGB triplet ("12 10 9") for photo scrims; text over photos is always light. */
  scrim: string;
  /** Light text used over photo scrims. */
  onPhoto: string;
  /** Mood words that select this palette from EventConfig.theme.mood or colors. */
  hints: RegExp;
};

export type HeroVariant = "cover" | "split" | "typeset" | "monogram" | "poster";
export type DetailsVariant = "columns" | "card" | "ticket";
export type ScheduleVariant = "timeline" | "agenda";
export type GalleryVariant = "masonry" | "grid";
export type StoryVariant = "letter" | "centered";
export type RsvpVariant = "split" | "centered";
export type ClosingVariant = "signoff" | "marquee";
export type Ornament = "rule" | "flourish" | "grid" | "squiggle" | "deco";
export type Frame = "rect" | "arch" | "rounded";

export type DesignStyle = {
  key: StyleKey;
  name: string;
  /** One line describing the identity, shown in the preview and fed to the AI art director. */
  identity: string;
  bestFor: string;
  fonts: { display: string; body: string; label: string };
  type: {
    displayWeight: number;
    /** Couple names and short titles in italic. */
    displayItalic: boolean;
    displayTracking: string;
    displayLeading: string;
    displayCase: "none" | "uppercase";
    labelTracking: string;
    labelSize: string;
    labelWeight: number;
    bodySize: string;
    bodyWeight: number;
    /** Multiplier on the phone-size floor of hero titles; >1 for condensed faces. */
    titleFloor: number;
    /** Width budget for the closing wordmark: font-size = this / title length (narrow faces get more). */
    wordmark: string;
  };
  shape: { radius: string; buttonRadius: string; frame: Frame };
  spacing: { sectionY: string; gutter: string; measure: string };
  ornament: Ornament;
  /** "rule": consecutive sections on the same tone are separated by a hairline. "tone": they alternate base/alt. */
  separation: "rule" | "tone";
  variants: {
    heroWithPhoto: HeroVariant;
    heroWithoutPhoto: HeroVariant;
    details: DetailsVariant;
    schedule: ScheduleVariant;
    gallery: GalleryVariant;
    story: StoryVariant;
    rsvp: RsvpVariant;
    closing: ClosingVariant;
  };
  tones: Partial<Record<"hero" | "details" | "schedule" | "story" | "gallery" | "goodToKnow" | "travel" | "rsvp" | "closing", Tone>>;
  palettes: Palette[];
};

const font = {
  instrument: "var(--font-instrument-serif)",
  newsreader: "var(--font-newsreader)",
  workSans: "var(--font-work-sans)",
  fraunces: "var(--font-fraunces)",
  spaceGrotesk: "var(--font-space-grotesk)",
  inter: "var(--font-inter)",
  bricolage: "var(--font-bricolage-grotesque)",
  outfit: "var(--font-outfit)",
  bodoni: "var(--font-bodoni-moda)",
  plex: "var(--font-ibm-plex-sans)",
};

export const DESIGN_STYLES: Record<StyleKey, DesignStyle> = {
  editorial: {
    key: "editorial",
    name: "Editorial",
    identity: "A printed magazine feature: oversized serif headlines, numbered sections, hairline rules, a drop cap and one hot ink accent on newsprint.",
    bestFor: "Modern weddings, milestone birthdays, book launches, gallery and dinner parties.",
    fonts: { display: font.instrument, body: font.newsreader, label: font.workSans },
    type: { displayWeight: 400, displayItalic: true, displayTracking: "-0.025em", displayLeading: "0.92", displayCase: "none", labelTracking: "0.16em", labelSize: "0.72rem", labelWeight: 600, bodySize: "1.125rem", bodyWeight: 400, wordmark: "185vw", titleFloor: 1.25 },
    shape: { radius: "0px", buttonRadius: "0px", frame: "rect" },
    spacing: { sectionY: "clamp(4.5rem, 10vw, 8.5rem)", gutter: "clamp(1.25rem, 5vw, 4rem)", measure: "76rem" },
    ornament: "rule",
    separation: "rule",
    variants: { heroWithPhoto: "split", heroWithoutPhoto: "typeset", details: "columns", schedule: "agenda", gallery: "masonry", story: "letter", rsvp: "split", closing: "marquee" },
    tones: { details: "alt", goodToKnow: "alt", rsvp: "inverse" },
    palettes: [
      {
        key: "newsprint",
        name: "Newsprint & vermilion",
        hints: /newsprint|red|vermilion|ink|black|white|monochrome|classic/i,
        accent: "#b3341a",
        onAccent: "#ffffff",
        pops: ["#b3341a"],
        scrim: "18 16 14",
        onPhoto: "#fbf8f1",
        tones: {
          base: { bg: "#f3efe6", card: "#fbf9f4", ink: "#161513", muted: "#55514a", accentText: "#a3301a", line: "#161513" },
          alt: { bg: "#e8e1d3", card: "#f5f0e6", ink: "#161513", muted: "#4d4943", accentText: "#962c17", line: "#161513" },
          inverse: { bg: "#161513", card: "#23211e", ink: "#f3efe6", muted: "#bdb6a8", accentText: "#f2896a", line: "#f3efe6" },
        },
      },
      {
        key: "riviera",
        name: "Riviera blue",
        hints: /navy|blue|riviera|coast|sea|nautical|cobalt/i,
        accent: "#1f4fd1",
        onAccent: "#ffffff",
        pops: ["#1f4fd1"],
        scrim: "12 20 33",
        onPhoto: "#f6f8fb",
        tones: {
          base: { bg: "#eef0f1", card: "#f9fafb", ink: "#0f1824", muted: "#4a5565", accentText: "#1d47c2", line: "#0f1824" },
          alt: { bg: "#e0e5ea", card: "#f1f4f6", ink: "#0f1824", muted: "#435060", accentText: "#1a41b3", line: "#0f1824" },
          inverse: { bg: "#0f1824", card: "#18243a", ink: "#eef0f1", muted: "#aab5c5", accentText: "#9db6ff", line: "#eef0f1" },
        },
      },
    ],
  },
  romantic: {
    key: "romantic",
    name: "Romantic",
    identity: "A letterpress invitation: soft light serif with italic names, arched photo frames, fine botanical flourishes and blush or sage paper tones.",
    bestFor: "Weddings, engagements, anniversaries, bridal and baby showers.",
    fonts: { display: font.fraunces, body: font.workSans, label: font.workSans },
    type: { displayWeight: 300, displayItalic: true, displayTracking: "-0.02em", displayLeading: "1", displayCase: "none", labelTracking: "0.28em", labelSize: "0.7rem", labelWeight: 500, bodySize: "1.0625rem", bodyWeight: 400, wordmark: "150vw", titleFloor: 1 },
    shape: { radius: "2px", buttonRadius: "999px", frame: "arch" },
    spacing: { sectionY: "clamp(4.5rem, 10vw, 8rem)", gutter: "clamp(1.25rem, 5vw, 3.5rem)", measure: "68rem" },
    ornament: "flourish",
    separation: "tone",
    variants: { heroWithPhoto: "split", heroWithoutPhoto: "monogram", details: "card", schedule: "timeline", gallery: "masonry", story: "centered", rsvp: "centered", closing: "signoff" },
    tones: { details: "alt", gallery: "base", rsvp: "alt", closing: "inverse" },
    palettes: [
      {
        key: "blush",
        name: "Blush & rosewood",
        hints: /blush|pink|rose|romantic|soft|peony|mauve/i,
        accent: "#9a525b",
        onAccent: "#ffffff",
        pops: ["#e7c3bf", "#c98f8f"],
        scrim: "46 26 28",
        onPhoto: "#fff8f4",
        tones: {
          base: { bg: "#fbf6f2", card: "#ffffff", ink: "#3b2b2b", muted: "#6c5753", accentText: "#8f4c55", line: "#b98a86" },
          alt: { bg: "#f4e8e2", card: "#fbf6f2", ink: "#3b2b2b", muted: "#654f4b", accentText: "#84444d", line: "#b07f7b" },
          inverse: { bg: "#4a2f33", card: "#573a3e", ink: "#fbf1ec", muted: "#e6d3cd", accentText: "#f3c7c5", line: "#d9a9a6" },
        },
      },
      {
        key: "sage",
        name: "Sage & linen",
        hints: /sage|green|garden|botanical|olive|forest|eucalyptus|linen/i,
        accent: "#56714f",
        onAccent: "#ffffff",
        pops: ["#c9d3bd", "#9fb193"],
        scrim: "30 38 31",
        onPhoto: "#f8f8f1",
        tones: {
          base: { bg: "#f5f4ee", card: "#ffffff", ink: "#2a3129", muted: "#59625a", accentText: "#4b6748", line: "#9aa98f" },
          alt: { bg: "#e8eadf", card: "#f5f4ee", ink: "#2a3129", muted: "#535c53", accentText: "#455f42", line: "#8fa085" },
          inverse: { bg: "#2e3a30", card: "#38463a", ink: "#f2f1e8", muted: "#cdd3c6", accentText: "#d3e3c6", line: "#a9bb9c" },
        },
      },
    ],
  },
  minimal: {
    key: "minimal",
    name: "Modern Minimal",
    identity: "Swiss-grid modernism: a crisp grotesk, a visible 12-column rhythm, indexed sections, huge numerals, lots of air and a single signal color.",
    bestFor: "Corporate offsites, launches, conferences, modern civil weddings, design-minded hosts.",
    fonts: { display: font.spaceGrotesk, body: font.inter, label: font.spaceGrotesk },
    type: { displayWeight: 500, displayItalic: false, displayTracking: "-0.045em", displayLeading: "0.95", displayCase: "none", labelTracking: "0.06em", labelSize: "0.78rem", labelWeight: 500, bodySize: "1.0625rem", bodyWeight: 400, wordmark: "160vw", titleFloor: 1 },
    shape: { radius: "4px", buttonRadius: "4px", frame: "rect" },
    spacing: { sectionY: "clamp(5rem, 12vw, 10rem)", gutter: "clamp(1.25rem, 5vw, 4.5rem)", measure: "80rem" },
    ornament: "grid",
    separation: "rule",
    variants: { heroWithPhoto: "cover", heroWithoutPhoto: "typeset", details: "columns", schedule: "agenda", gallery: "grid", story: "letter", rsvp: "split", closing: "marquee" },
    tones: { rsvp: "inverse", closing: "inverse" },
    palettes: [
      {
        key: "cobalt",
        name: "Paper & cobalt",
        hints: /blue|cobalt|corporate|tech|startup|cool|navy/i,
        accent: "#2b4bf2",
        onAccent: "#ffffff",
        pops: ["#2b4bf2"],
        scrim: "8 8 10",
        onPhoto: "#ffffff",
        tones: {
          base: { bg: "#f5f5f2", card: "#ffffff", ink: "#0c0c0d", muted: "#55565b", accentText: "#2340e0", line: "#0c0c0d" },
          alt: { bg: "#e9e9e4", card: "#f5f5f2", ink: "#0c0c0d", muted: "#4e4f54", accentText: "#1f3ad0", line: "#0c0c0d" },
          inverse: { bg: "#0c0c0d", card: "#18181a", ink: "#f5f5f2", muted: "#a6a7ab", accentText: "#a3b2ff", line: "#f5f5f2" },
        },
      },
      {
        key: "signal",
        name: "Concrete & signal orange",
        hints: /orange|warm|sunset|signal|bold|industrial/i,
        accent: "#c2410c",
        onAccent: "#ffffff",
        pops: ["#c2410c"],
        scrim: "10 9 8",
        onPhoto: "#ffffff",
        tones: {
          base: { bg: "#f2f1ee", card: "#fbfbfa", ink: "#111110", muted: "#57554f", accentText: "#b23b0b", line: "#111110" },
          alt: { bg: "#e6e4df", card: "#f2f1ee", ink: "#111110", muted: "#4f4d48", accentText: "#a3360a", line: "#111110" },
          inverse: { bg: "#111110", card: "#1c1b19", ink: "#f2f1ee", muted: "#aaa79f", accentText: "#ff9a6b", line: "#f2f1ee" },
        },
      },
    ],
  },
  playful: {
    key: "playful",
    name: "Playful",
    identity: "A party poster: chunky grotesk, saturated sherbet color blocks, rounded cards, stickers and squiggles, tilted photos and big friendly buttons.",
    bestFor: "Birthdays, kids' parties, showers, game nights, summer parties, reunions.",
    fonts: { display: font.bricolage, body: font.outfit, label: font.outfit },
    type: { displayWeight: 800, displayItalic: false, displayTracking: "-0.04em", displayLeading: "0.9", displayCase: "none", labelTracking: "0.08em", labelSize: "0.8rem", labelWeight: 700, bodySize: "1.125rem", bodyWeight: 400, wordmark: "140vw", titleFloor: 1 },
    shape: { radius: "28px", buttonRadius: "999px", frame: "rounded" },
    spacing: { sectionY: "clamp(4rem, 9vw, 7rem)", gutter: "clamp(1.25rem, 5vw, 3.5rem)", measure: "72rem" },
    ornament: "squiggle",
    separation: "tone",
    variants: { heroWithPhoto: "split", heroWithoutPhoto: "poster", details: "ticket", schedule: "timeline", gallery: "grid", story: "centered", rsvp: "centered", closing: "signoff" },
    tones: { details: "base", schedule: "alt", goodToKnow: "base", rsvp: "inverse", closing: "alt" },
    palettes: [
      {
        key: "sherbet",
        name: "Sherbet",
        hints: /sherbet|orange|pink|peach|sunset|citrus|tropical|bright|party/i,
        accent: "#ff5a36",
        onAccent: "#1e1033",
        pops: ["#ffc93c", "#ff8fb1", "#7b61ff", "#2ec4b6", "#ff5a36"],
        scrim: "30 16 51",
        onPhoto: "#fff8ef",
        tones: {
          base: { bg: "#fff3e3", card: "#ffffff", ink: "#1e1033", muted: "#4d4360", accentText: "#b42d12", line: "#1e1033" },
          alt: { bg: "#ffdbe6", card: "#fff5f8", ink: "#1e1033", muted: "#4c3850", accentText: "#9c2340", line: "#1e1033" },
          inverse: { bg: "#2a1650", card: "#3a2268", ink: "#fff3e3", muted: "#ddd2f0", accentText: "#ffc93c", line: "#fff3e3" },
        },
      },
      {
        key: "lagoon",
        name: "Lagoon",
        hints: /teal|mint|lagoon|aqua|pool|summer|kids|lemon|yellow/i,
        accent: "#ffcf3d",
        onAccent: "#0d2b33",
        pops: ["#ffcf3d", "#ff7a59", "#29b6a5", "#8e7cff", "#ff9ec7"],
        scrim: "13 43 51",
        onPhoto: "#f4fffb",
        tones: {
          base: { bg: "#eafaf4", card: "#ffffff", ink: "#0d2b33", muted: "#3d5a60", accentText: "#0b6e63", line: "#0d2b33" },
          alt: { bg: "#fff2b8", card: "#fffbea", ink: "#0d2b33", muted: "#4a4a32", accentText: "#8a3d10", line: "#0d2b33" },
          inverse: { bg: "#0d3b47", card: "#14505f", ink: "#f4fffb", muted: "#c3e1df", accentText: "#ffd75e", line: "#f4fffb" },
        },
      },
    ],
  },
  noir: {
    key: "noir",
    name: "Luxe Noir",
    identity: "A black-tie evening: high-contrast Didone type on near-black, champagne text, fine gold rules and art-deco ornaments, with one ivory interlude.",
    bestFor: "Galas, black-tie weddings, anniversaries, award nights, New Year's Eve, luxury launches.",
    fonts: { display: font.bodoni, body: font.plex, label: font.plex },
    type: { displayWeight: 400, displayItalic: true, displayTracking: "-0.015em", displayLeading: "0.98", displayCase: "none", labelTracking: "0.3em", labelSize: "0.7rem", labelWeight: 500, bodySize: "1.0625rem", bodyWeight: 400, wordmark: "150vw", titleFloor: 1 },
    shape: { radius: "0px", buttonRadius: "0px", frame: "arch" },
    spacing: { sectionY: "clamp(5rem, 11vw, 9rem)", gutter: "clamp(1.25rem, 5vw, 4rem)", measure: "72rem" },
    ornament: "deco",
    separation: "tone",
    variants: { heroWithPhoto: "cover", heroWithoutPhoto: "monogram", details: "ticket", schedule: "timeline", gallery: "grid", story: "centered", rsvp: "centered", closing: "signoff" },
    tones: { details: "alt", goodToKnow: "inverse", rsvp: "alt" },
    palettes: [
      {
        key: "gilded",
        name: "Black & gold",
        hints: /gold|black|noir|gala|black[- ]?tie|luxury|glam|champagne|art deco/i,
        accent: "#c9a45c",
        onAccent: "#0e0d0b",
        pops: ["#c9a45c", "#8a6d35"],
        scrim: "8 7 6",
        onPhoto: "#f6eedd",
        tones: {
          base: { bg: "#0e0d0b", card: "#181613", ink: "#f2e9d8", muted: "#b9ae99", accentText: "#d6b46f", line: "#c9a45c" },
          alt: { bg: "#17140f", card: "#211d17", ink: "#f2e9d8", muted: "#bcb19c", accentText: "#d9b773", line: "#c9a45c" },
          inverse: { bg: "#efe6d3", card: "#f8f2e6", ink: "#14120e", muted: "#5a5243", accentText: "#7a5c24", line: "#9c7b3c" },
        },
      },
      {
        key: "emerald",
        name: "Emerald & brass",
        hints: /emerald|green|jade|velvet|forest|botanical/i,
        accent: "#c8a96a",
        onAccent: "#0a1612",
        pops: ["#c8a96a", "#2f6b55"],
        scrim: "6 16 12",
        onPhoto: "#f3eedf",
        tones: {
          base: { bg: "#0a1612", card: "#10211b", ink: "#efe9db", muted: "#b0b8a9", accentText: "#d4b67c", line: "#c8a96a" },
          alt: { bg: "#0e1d18", card: "#142821", ink: "#efe9db", muted: "#b4bcad", accentText: "#d6b97f", line: "#c8a96a" },
          inverse: { bg: "#ece4d0", card: "#f6f0e2", ink: "#0a1612", muted: "#4f5a50", accentText: "#6f5521", line: "#8c7038" },
        },
      },
    ],
  },
};

export function isStyleKey(value: string): value is StyleKey {
  return (STYLE_KEYS as readonly string[]).includes(value);
}

/** An explicit key wins; otherwise the event's mood/colors pick a palette by hint words; otherwise the style's first. */
export function pickPalette(style: DesignStyle, moodText: string, paletteKey?: string): Palette {
  return style.palettes.find((palette) => palette.key === paletteKey)
    ?? style.palettes.find((palette) => palette.hints.test(moodText))
    ?? style.palettes[0];
}
