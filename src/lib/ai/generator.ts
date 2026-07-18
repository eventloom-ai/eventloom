import { env } from "@/lib/env";
import type { EventConfig, PageArtifact } from "@/lib/types";
import { validateGeneratedArtifact } from "@/lib/validation";

export type ImageInput = {
  name: string;
  mediaType: string;
  dataUrl: string;
};

export function defaultEventConfig(prompt: string): EventConfig {
  const isWedding = /\bwedding\b/i.test(prompt);
  const hasSeparateHalls = /(?:separate|different)\s+(?:men'?s|women'?s|male|female).{0,50}(?:hall|reception)|(?:men'?s|women'?s).{0,50}(?:separate|different).{0,50}(?:hall|reception)/i.test(prompt);
  return {
    title: isWedding ? "Wedding celebration" : "Your event",
    subtitle: "A custom event page that helps guests reply in one simple place.",
    eventType: isWedding ? "wedding" : "event",
    date: "Date to be announced",
    venueName: "Venue to be announced",
    rsvpFields: ["name", "attendance", "party_size", "guest_names", "note"],
    schedule: hasSeparateHalls
      ? [
          { title: "Men's hall", time: "Time to be announced", location: "Men's hall", description: "Details to be announced." },
          { title: "Women's hall", time: "Time to be announced", location: "Women's hall", description: "Details to be announced." },
        ]
      : [{ title: "Event details", time: "Time to be announced", description: "Details to be announced." }],
    theme: {
      mood: "custom editorial",
      colors: ["#191713", "#f7f4ee", "#b48a5a", "#405448"],
      fontPairing: "elegant serif with modern sans",
    },
  };
}

export async function generatePageArtifact(config: EventConfig, prompt: string, images: ImageInput[] = []): Promise<PageArtifact> {
  const openaiKey = env.openaiApiKey();
  if (openaiKey) {
    const artifact = await generateWithOpenAI(openaiKey, config, prompt, images);
    if (artifact) {
      return artifact;
    }
  }

  const gateway = env.aiGatewayUrl();
  const apiKey = env.aiApiKey();

  if (gateway && apiKey) {
    const result = await fetch(gateway, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.aiModel(),
        messages: [
          {
            role: "system",
            content:
              "Generate a complete, safe, frontend-only event page as JSON with html and css. Do not use a template or a standard event-page layout: the requested visual direction must affect composition, hierarchy, typography, color, texture, and spacing. Include all event content in the generated markup. No scripts, event handlers, network calls, storage, cookies, or forms.",
          },
          { role: "user", content: JSON.stringify({ prompt, config }) },
        ],
      }),
    });

    if (result.ok) {
      const json = (await result.json()) as { html?: string; css?: string; content?: string };
      const candidate = {
        html: json.html ?? json.content ?? "",
        css: json.css ?? "",
        generatedAt: new Date().toISOString(),
        model: env.aiModel(),
      };
      const validated = validateGeneratedArtifact(candidate);
      if (validated.ok) {
        return validated.artifact;
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    model: "deterministic-fallback",
    css: "",
    html: `<section class="eventloom-fallback"><p class="eventloom-fallback__eyebrow">${escapeHtml(config.eventType)}</p><h1>${escapeHtml(config.title)}</h1><p class="eventloom-fallback__intro">${escapeHtml(config.subtitle)}</p><div class="eventloom-fallback__details"><p>${escapeHtml(config.date)}</p><p>${escapeHtml(config.venueName)}</p></div><section class="eventloom-fallback__schedule"><h2>Schedule</h2>${config.schedule.map((item) => `<article><p>${escapeHtml(item.time)}</p><h3>${escapeHtml(item.title)}</h3>${item.location ? `<span>${escapeHtml(item.location)}</span>` : ""}${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</article>`).join("")}</section></section>`,
  };
}

async function generateWithOpenAI(openaiKey: string, config: EventConfig, prompt: string, images: ImageInput[]) {
  const inputContent = [
    {
      type: "input_text",
      text: [
        "Create the complete visual website for this event as safe HTML and CSS.",
        "Return JSON only with html and css.",
        "Do not include scripts, event handlers, network calls, cookies, browser storage, forms, or payment elements.",
        "The Eventloom page will place the managed RSVP form after your markup. Include a clear RSVP invitation in the page and CSS for .eventloom-managed-rsvp so it visually belongs to your design.",
        "This is not a template task: invent a complete, original composition based on the customer's visual direction. Do not use a generic centered-card hero, standard two-column layout, or repeating event-site structure.",
        "Include the supplied schedule, venue, and any hall details in the generated markup. Use CSS scoped to .eventloom-generated-page and .eventloom-managed-rsvp; do not style html or body.",
        `Customer request: ${prompt}`,
        `Starting event details: ${JSON.stringify(config)}`,
      ].join("\n"),
    },
    ...images.slice(0, 4).map((image) => ({
      type: "input_image",
      image_url: image.dataUrl,
    })),
  ];

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
            "You are Eventloom's generative art director and frontend designer. Every page must be an original, complete, mobile-friendly event site driven by the customer brief. Never start from a fixed template, preset section order, or standard layout. Treat the stated visual direction as a hard requirement that changes layout, typography, palette, texture, spacing, and visual hierarchy. Stay safe to render.",
        },
        {
          role: "user",
          content: inputContent,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "eventloom_page_artifact",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              html: { type: "string" },
              css: { type: "string" },
            },
            required: ["html", "css"],
          },
        },
      },
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const data = (await response.json().catch(() => null)) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  const textOutput = data?.output_text ?? data?.output?.flatMap((item) => item.content ?? []).map((content) => content.text).filter(Boolean).join("\n");
  if (!textOutput) {
    return null;
  }

  const parsed = safeJsonParse(textOutput);
  if (!parsed) {
    return null;
  }

  const validated = validateGeneratedArtifact({
    html: parsed.html ?? "",
    css: parsed.css ?? "",
    generatedAt: new Date().toISOString(),
    model: env.aiModel(),
  });

  return validated.ok ? validated.artifact : null;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as { html?: string; css?: string };
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
