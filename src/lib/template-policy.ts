import type { EventConfig, EventSiteTemplate } from "@/lib/types";
import { enrichConfigTheme, extractPaletteFromPrompt, prefersCelebrationTemplate } from "@/lib/event-theme";

export function usesWeddingTemplate(config: EventConfig) {
  return config.template !== "custom";
}

export function defaultTemplateForPrompt(prompt: string): EventSiteTemplate {
  return prefersCelebrationTemplate(prompt) ? "wedding-rsvp" : "custom";
}

export function normalizeGeneratedConfig(config: EventConfig, prompt: string): EventConfig {
  const template =
    config.template === "custom" && prefersCelebrationTemplate(prompt)
      ? "wedding-rsvp"
      : (config.template ?? defaultTemplateForPrompt(prompt));

  let next: EventConfig = {
    ...config,
    template,
    hallInfo: config.hallInfo || "Details shared with invited guests",
    directionsLabel: config.directionsLabel || "Location shared with invited guests",
    rsvpDeadline: config.rsvpDeadline || "Please reply before the event",
    rsvpFields: config.rsvpFields?.length ? config.rsvpFields : ["name", "attendance", "party_size", "guest_names", "note"],
  };

  next = enrichConfigTheme(next, prompt);

  const palette = extractPaletteFromPrompt(prompt);
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
