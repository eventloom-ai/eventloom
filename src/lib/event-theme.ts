import type { EventConfig } from "@/lib/types";

export type EventPalette = {
  text: string;
  surface: string;
  accent: string;
  muted: string;
  accentHover: string;
  accentRgb: string;
  blush: string;
  cssVars: Record<string, string>;
  background: string;
};

const DEFAULT_COLORS = ["#1f1a17", "#f7f2ed", "#6f3032", "#747d5c"] as const;

const MOOD_PALETTES: Record<string, string[]> = {
  blush: ["#2a1f1f", "#fdf6f4", "#b85c6d", "#8f7d6b"],
  navy: ["#0f1b2d", "#f4f7fb", "#1e4d8c", "#6b7f9e"],
  gold: ["#2c2418", "#faf6ef", "#9a7b3f", "#6f5f4a"],
  forest: ["#142019", "#f3f7f2", "#2f5d46", "#6d8575"],
  lavender: ["#241f2e", "#f7f4fb", "#6f4d8c", "#8d7da8"],
  sunset: ["#2d1a14", "#fff6f0", "#d4623c", "#9a6b55"],
  monochrome: ["#111111", "#f5f5f5", "#333333", "#777777"],
};

function normalizeHex(color: string) {
  const value = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return null;
}

function hexToRgbTuple(hex: string) {
  const normalized = normalizeHex(hex) ?? DEFAULT_COLORS[2];
  const raw = normalized.slice(1);
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function shadeHex(hex: string, amount: number) {
  const normalized = normalizeHex(hex) ?? DEFAULT_COLORS[2];
  const raw = normalized.slice(1);
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const mix = (channel: number) => clamp(channel + (amount < 0 ? channel * amount : (255 - channel) * amount));
  const r = mix(Number.parseInt(raw.slice(0, 2), 16));
  const g = mix(Number.parseInt(raw.slice(2, 4), 16));
  const b = mix(Number.parseInt(raw.slice(4, 6), 16));
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function extractPaletteFromPrompt(prompt: string): string[] | null {
  const lower = prompt.toLowerCase();
  for (const [mood, palette] of Object.entries(MOOD_PALETTES)) {
    if (lower.includes(mood)) return palette;
  }

  const hexMatches = [...prompt.matchAll(/#(?:[0-9a-fA-F]{3}){1,2}\b/g)]
    .map((match) => normalizeHex(match[0]))
    .filter((value): value is string => Boolean(value));

  if (hexMatches.length >= 2) {
    const text = hexMatches[0];
    const accent = hexMatches[1];
    return [text, shadeHex(text, 0.94), accent, shadeHex(accent, 0.35)];
  }

  return null;
}

export function resolveEventPalette(config: EventConfig): EventPalette {
  const colors = config.theme.colors
    .map((color) => normalizeHex(color))
    .filter((color): color is string => Boolean(color));

  const text = colors[0] ?? DEFAULT_COLORS[0];
  const surface = colors[1] ?? DEFAULT_COLORS[1];
  const accent = colors[2] ?? DEFAULT_COLORS[2];
  const muted = colors[3] ?? DEFAULT_COLORS[3];
  const accentHover = shadeHex(accent, -0.12);
  const accentRgb = hexToRgbTuple(accent);
  const blush = shadeHex(accent, 0.55);

  return {
    text,
    surface,
    accent,
    muted,
    accentHover,
    accentRgb,
    blush,
    cssVars: {
      "--el-text": text,
      "--el-surface": surface,
      "--el-accent": accent,
      "--el-muted": muted,
      "--el-accent-hover": accentHover,
      "--el-accent-rgb": accentRgb,
      "--el-blush": blush,
    },
    background: `radial-gradient(circle at 18% 12%, rgba(${hexToRgbTuple(blush)}, 0.34), transparent 28rem), radial-gradient(circle at 86% 16%, rgba(${hexToRgbTuple(muted)}, 0.18), transparent 24rem), linear-gradient(135deg, ${shadeHex(surface, 0.03)} 0%, ${surface} 45%, ${shadeHex(surface, -0.03)} 100%)`,
  };
}

export function enrichConfigTheme(config: EventConfig, prompt: string): EventConfig {
  const extracted = extractPaletteFromPrompt(prompt);
  if (!extracted) return config;

  return {
    ...config,
    theme: {
      ...config.theme,
      colors: extracted,
    },
  };
}

export function prefersCustomTemplate(prompt: string) {
  return /corporate|conference|webinar|minimal html|plain landing|no rsvp|product launch page/i.test(prompt);
}

export function prefersCelebrationTemplate(prompt: string) {
  return !prefersCustomTemplate(prompt);
}
