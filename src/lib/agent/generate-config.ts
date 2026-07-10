import { defaultEventConfig } from "@/lib/ai/generator";
import { env } from "@/lib/env";
import type { ThemeOverrides } from "@/lib/event-theme";
import { extractPaletteFromPrompt } from "@/lib/event-theme";
import { normalizeGeneratedConfig } from "@/lib/template-policy";
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
    template: { type: "string", enum: ["custom"] },
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
            "You are Eventloom's event site planner. Every site must feel original to the customer's brief—never select or imitate a fixed template. Extract the desired mood and colors from their prompt and output an intentional four-color palette: [text, surface, accent, muted] as hex codes. Write specific, evocative titles, subtitles, schedule and venue copy, while ensuring the core guest RSVP details are represented in the plan. Never use famous real people's names.",
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
      template: "custom",
      config,
    };
  } catch {
    return fallback;
  }
}

function fallbackSitePlan(prompt: string, themeOverrides?: ThemeOverrides): GeneratedSitePlan {
  const base = defaultEventConfig(prompt);
  const palette = extractPaletteFromPrompt(prompt);
  const template = "custom" as const;
  const richSchedule = base.schedule.map((item) => ({
    title: item.title,
    time: item.time,
    location: item.location ?? "",
    description: item.description ?? "",
  }));

  const config = normalizeGeneratedConfig(
    {
      ...base,
      template,
      subtitle: base.subtitle,
      schedule: richSchedule,
      theme: {
        mood: palette ? "customer palette" : base.theme.mood,
        colors: palette ?? base.theme.colors,
        fontPairing: "expressive display with clean sans",
      },
    },
    prompt,
    themeOverrides,
  );

  return { template: config.template ?? template, config };
}
