import { defaultEventConfig } from "@/lib/ai/generator";
import { briefFacts } from "@/lib/agent/brief-facts";
import { env, openaiResponsesOptions } from "@/lib/env";
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
      ...openaiResponsesOptions(),
      input: [
        {
          role: "system",
          content:
            "You are Eventloom's event site planner. Every site must feel original to the customer's brief—never select or imitate a fixed template. The brief is the source of truth: preserve every requested feature, language, audience split, and visual direction in the output. Do not invent names, dates, times, venues, addresses, or translations that the customer did not provide. For an omitted fact, use a clear placeholder such as 'To be announced' rather than making one up. If separate groups or halls are requested, include separate schedule entries and hallInfo for each group. Extract the desired mood and colors from their prompt and output an intentional four-color palette: [text, surface, accent, muted] as hex codes. Write specific, evocative copy only from facts in the brief, while ensuring the core guest RSVP details are represented in the plan. Never use famous real people's names.",
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
    signal: AbortSignal.timeout(240_000),
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
      config: groundConfigInPrompt(config, prompt),
    };
  } catch {
    return fallback;
  }
}

const GENERIC_TITLE_WORDS = new Set(["the", "and", "for", "with", "event", "wedding", "party", "celebration", "your"]);

function promptSupportsFact(value: string | undefined, prompt: string) {
  if (!value?.trim()) return false;
  const haystack = prompt.toLowerCase();
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2 && !GENERIC_TITLE_WORDS.has(token))
    .some((token) => haystack.includes(token));
}

const DATE_CUE = /\b(?:today|tomorrow|next\s+\w+)\b|\b\d{4}-\d{2}-\d{2}(?!\d)/i;
const VENUE_CUE = /\b(?:at|venue|location)\s+(?!(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:a\.?\s?m|p\.?\s?m)\b|\d{1,2}:\d{2}|noon\b|midnight\b)[^,.\n]+/i;
const TBA_TIME = /^\s*$|to be (?:announced|confirmed)|\btba\b|\btbd\b/i;

export function groundConfigInPrompt(config: EventConfig, prompt: string): EventConfig {
  const facts = briefFacts(prompt);
  const hasDate = Boolean(facts.date) || DATE_CUE.test(prompt);
  const hasTime = Boolean(facts.time);
  const hasVenue = Boolean(facts.venue) || VENUE_CUE.test(prompt) || promptSupportsFact(config.venueName, prompt);
  const isWedding = /\bwedding\b/i.test(prompt);
  const hasSeparateHalls = /(?:separate|different)\s+(?:men'?s|women'?s|male|female).{0,50}(?:hall|reception)|(?:men'?s|women'?s).{0,50}(?:separate|different).{0,50}(?:hall|reception)/i.test(prompt);
  const schedule = config.schedule.map((item, index) => {
    const time = hasTime || promptSupportsFact(item.time, prompt) ? item.time : "Time to be announced";
    return { ...item, time: !hasSeparateHalls && index === 0 && facts.time && TBA_TIME.test(time) ? facts.time : time };
  });

  if (hasSeparateHalls && !schedule.some((item) => /men'?s|women'?s/i.test(`${item.title} ${item.location ?? ""}`))) {
    schedule.push(
      { title: "Men's hall", time: hasTime ? "" : "Time to be announced", location: "Men's hall", description: "Details to be announced." },
      { title: "Women's hall", time: hasTime ? "" : "Time to be announced", location: "Women's hall", description: "Details to be announced." },
    );
  }

  const titleFromPrompt = promptSupportsFact(config.title, prompt);
  const genericSubtitle = /custom event page that helps guests reply/i.test(config.subtitle);
  return {
    ...config,
    title: titleFromPrompt ? config.title : isWedding ? "Wedding celebration" : config.eventType ? `${config.eventType[0]?.toUpperCase()}${config.eventType.slice(1)}` : "Your event",
    subtitle: genericSubtitle ? "Details to be announced." : config.subtitle,
    date: hasDate || promptSupportsFact(config.date, prompt) ? config.date : "Date to be announced",
    venueName: hasVenue ? config.venueName : "Venue to be announced",
    venueAddress: hasVenue ? config.venueAddress : undefined,
    hallInfo: hasSeparateHalls ? "Separate men's and women's hall details will be shared with guests." : config.hallInfo,
    schedule,
  };
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

  const config = groundConfigInPrompt(normalizeGeneratedConfig(
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
  ), prompt);

  return { template: config.template ?? template, config };
}
