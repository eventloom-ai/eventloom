import { env } from "@/lib/env";
import type { EventConfig, PageArtifact } from "@/lib/types";
import { validateGeneratedArtifact } from "@/lib/validation";

export type ImageInput = {
  name: string;
  mediaType: string;
  dataUrl: string;
};

export function defaultEventConfig(prompt: string): EventConfig {
  const title = prompt.match(/for\s+([^,.]+)/i)?.[1]?.trim() || "Your Event";
  return {
    title,
    subtitle: "A custom event page that helps guests reply in one simple place.",
    eventType: prompt.toLowerCase().includes("wedding") ? "wedding" : "event",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10),
    venueName: "Venue to be announced",
    rsvpFields: ["name", "attendance", "party_size", "guest_names", "note"],
    schedule: [
      { title: "Arrival", time: "6:00 PM", description: "Guests arrive and check in." },
      { title: "Main Event", time: "7:00 PM", description: "The featured celebration begins." },
      { title: "Reception", time: "8:30 PM", description: "Food, music, and conversation." },
    ],
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
              "Generate a safe frontend-only event page artifact as JSON with html and css. No scripts, no event handlers, no network calls, no storage, no cookies.",
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
    html: `
      <section class="space-y-8">
        <p class="text-sm uppercase tracking-[0.28em] text-[#b48a5a]">${config.eventType}</p>
        <h1>${escapeHtml(config.title)}</h1>
        <p class="max-w-2xl text-xl text-stone-700">${escapeHtml(config.subtitle)}</p>
        <p class="text-stone-600">${escapeHtml(config.date)} · ${escapeHtml(config.venueName)}</p>
      </section>
    `,
  };
}

async function generateWithOpenAI(openaiKey: string, config: EventConfig, prompt: string, images: ImageInput[]) {
  const inputContent = [
    {
      type: "input_text",
      text: [
        "Create a custom event website section as safe HTML and CSS.",
        "Return JSON only with html and css.",
        "Do not include scripts, event handlers, network calls, cookies, browser storage, forms, or payment elements.",
        "The Eventloom page will add the guest reply form separately.",
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
            "You are Eventloom's page designer. Create elegant, mobile-friendly event page markup that reflects the user's event and images while staying safe to render.",
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
