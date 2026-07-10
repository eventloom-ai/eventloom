import type { EventConfig } from "@/lib/types";
import { applyThemeOverrides, enrichConfigTheme, extractPaletteFromPrompt, type ThemeOverrides } from "@/lib/event-theme";

export function normalizeGeneratedConfig(config: EventConfig, prompt: string, themeOverrides?: ThemeOverrides): EventConfig {
  const template = "custom";

  let next: EventConfig = {
    ...config,
    template,
    hallInfo: config.hallInfo || "Details shared with invited guests",
    directionsLabel: config.directionsLabel || "Location shared with invited guests",
    rsvpDeadline: config.rsvpDeadline || "Please reply before the event",
    rsvpFields: config.rsvpFields?.length ? config.rsvpFields : ["name", "attendance", "party_size", "guest_names", "note"],
  };

  next = applyThemeOverrides(next, themeOverrides);
  next = enrichConfigTheme(next, prompt);

  const palette = themeOverrides?.mood
    ? null
    : extractPaletteFromPrompt(prompt);
  if (palette) {
    next = { ...next, theme: { ...next.theme, colors: palette } };
  } else if (next.theme.colors.length < 4) {
    next = {
      ...next,
      theme: {
        ...next.theme,
        colors: next.theme.colors.length ? next.theme.colors : ["#1f1a17", "#f7f2ed", "#6f3032", "#747d5c"],
      },
    };
  }

  return next;
}
