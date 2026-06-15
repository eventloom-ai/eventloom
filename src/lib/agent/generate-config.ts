import { defaultEventConfig } from "@/lib/ai/generator";
import { env } from "@/lib/env";
import type { ThemeOverrides } from "@/lib/event-theme";
import { extractPaletteFromPrompt } from "@/lib/event-theme";
import { defaultTemplateForPrompt, normalizeGeneratedConfig } from "@/lib/template-policy";
import type { EventConfig, EventSiteTemplate } from "@/lib/types";

type GeneratedSitePlan = {
  config: EventConfig;
  template: EventSiteTemplate;
};

const eventConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    eventType: { type: "string" },
    date: { type: "string" },
    venueName: { type: "string" },
    venueAddress: { type: "string" },
    hallInfo: { type: "string" },
    directionsLabel: { type: "string" },
    rsvpDeadline: { type: "string" },
    template: { type: "string", enum: ["wedding-rsvp", "custom"] },
    schedule: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          time: { type: "string" },
          location: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "time", "location", "description"],
      },
    },
    theme: {
      type: "object",
      additionalProperties: false,
      properties: {
        mood: { type: "string" },
        colors: { type: "array", items: { type: "string" } },
        fontPairing: { type: "string" },
      },
      required: ["mood", "colors", "fontPairing"],
    },
  },
  required: [
    "title",
    "subtitle",
    "eventType",
    "date",
    "venueName",
    "venueAddress",
    "hallInfo",
    "directionsLabel",
    "rsvpDeadline",
    "template",
    "schedule",
    "theme",
  ],
} as const;

export async function generateSitePlan(prompt: string, themeOverrides?: ThemeOverrides): Promise<GeneratedSitePlan> {
  const fallback = fallbackSitePlan(prompt, themeOverrides);
  const openaiKey = env.openaiApiKey();
  if (!openaiKey) {
    return fallback;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.aiModel(),
      input: [
        {
          role: "system",
          content:
            "You are Eventloom's luxury event site planner. Build rich, editorial-quality celebration sites using the wedding-rsvp template by default for weddings, engagements, birthdays, anniversaries, galas, and family events. Only choose custom for corporate conferences or pages that explicitly should not use the premium RSVP experience. Extract the customer's desired mood and colors from their prompt (e.g. blush, navy, gold, lavender, forest, sunset) and output an intentional 4-color palette: [text, surface, accent, muted] as hex codes. Write evocative titles, subtitles, a detailed schedule, venue copy, and RSVP deadline. Never use famous real people's names.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "eventloom_site_plan",
          strict: true,
          schema: eventConfigSchema,
        },
      },
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return fallback;
  }

  const data = (await response.json().catch(() => null)) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  } | null;

  const textOutput =
    data?.output_text ??
    data?.output?.flatMap((item) => item.content ?? []).map((content) => content.text).filter(Boolean).join("\n");

  if (!textOutput) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(textOutput) as Omit<EventConfig, "rsvpFields"> & { template: EventSiteTemplate };
    const config = normalizeGeneratedConfig(
      {
        ...parsed,
        rsvpFields: ["name", "attendance", "party_size", "guest_names", "note"],
      },
      prompt,
      themeOverrides,
    );
    return {
      template: config.template ?? "wedding-rsvp",
      config,
    };
  } catch {
    return fallback;
  }
}

function fallbackSitePlan(prompt: string, themeOverrides?: ThemeOverrides): GeneratedSitePlan {
  const base = defaultEventConfig(prompt);
  const palette = extractPaletteFromPrompt(prompt);
  const template = defaultTemplateForPrompt(prompt);

  const richSchedule =
    template === "wedding-rsvp"
      ? [
          { title: "Reception", time: "6:00 PM", location: "", description: "Welcome drinks and soft music as guests arrive." },
          { title: "Ceremony", time: "6:45 PM", location: "Main Hall", description: "The celebration begins with a warm procession." },
          { title: "Dinner", time: "8:00 PM", location: "Dining Hall", description: "A curated dinner service with toasts and conversation." },
        ]
      : base.schedule.map((item) => ({
          title: item.title,
          time: item.time,
          location: item.location ?? "",
          description: item.description ?? "",
        }));

  const config = normalizeGeneratedConfig(
    {
      ...base,
      template,
      subtitle:
        template === "wedding-rsvp"
          ? "We would be honored to celebrate this day with the people who matter most."
          : base.subtitle,
      schedule: richSchedule,
      theme: {
        mood: palette ? "customer palette" : template === "wedding-rsvp" ? "soft luxury celebration" : base.theme.mood,
        colors: palette ?? (template === "wedding-rsvp" ? ["#1f1a17", "#f7f2ed", "#6f3032", "#747d5c"] : base.theme.colors),
        fontPairing: "romantic serif with clean sans",
      },
    },
    prompt,
    themeOverrides,
  );

  return { template: config.template ?? template, config };
}
