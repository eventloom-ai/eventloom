import { defaultEventConfig } from "@/lib/ai/generator";
import { env } from "@/lib/env";
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

export async function generateSitePlan(prompt: string): Promise<GeneratedSitePlan> {
  const fallback = fallbackSitePlan(prompt);
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
            "You are Eventloom's site planner. Turn a customer prompt into a complete event website plan. Use wedding-rsvp for weddings, engagements, and bilingual family celebrations. Use custom for other events. Never include real personal names from famous people; use tasteful placeholders when needed. Keep venue details generic unless the user provided them.",
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
    return {
      template: parsed.template,
      config: {
        ...parsed,
        rsvpFields: ["name", "attendance", "party_size", "guest_names", "note"],
      },
    };
  } catch {
    return fallback;
  }
}

function fallbackSitePlan(prompt: string): GeneratedSitePlan {
  const base = defaultEventConfig(prompt);
  const weddingLike = /wedding|engagement|zaffa|bilingual|arabic|bride|groom/i.test(prompt);

  if (!weddingLike) {
    return { template: "custom", config: { ...base, template: "custom" } };
  }

  return {
    template: "wedding-rsvp",
    config: {
      ...base,
      template: "wedding-rsvp",
      eventType: "wedding",
      title: base.title === "Your Event" ? "Alex & Sarah" : base.title,
      subtitle: "Request the honor of your presence at their wedding celebration.",
      date: "Summer 2026",
      venueName: "Private Event Hall",
      hallInfo: "Men's Hall: A · Women's Hall: F",
      directionsLabel: "Location shared with invited guests",
      rsvpDeadline: "Please reply two weeks before the event",
      schedule: [
        { title: "Reception", time: "6:00 PM", location: "", description: "Enjoy drinks from our soft bar." },
        { title: "Zaffa & Dabka", time: "6:45 PM", location: "Hall A — Men", description: "Traditional Zaffa procession and Dabka folk dance." },
        { title: "Bride & Groom Entrance", time: "7:15 PM", location: "Hall F — Women", description: "The couple makes their grand entrance." },
        {
          title: "Dinner",
          time: "8:00 PM (Men) · 8:30 PM (Women)",
          location: "Hall A (Men) · Hall F (Women)",
          description: "Dinner in the respective halls.",
        },
      ],
      theme: {
        mood: "soft luxury wedding",
        colors: ["#1f1a17", "#f7f2ed", "#6f3032", "#747d5c"],
        fontPairing: "romantic serif with clean sans",
      },
    },
  };
}
