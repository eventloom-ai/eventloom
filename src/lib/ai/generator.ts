import { env } from "@/lib/env";
import type { EventConfig, PageArtifact } from "@/lib/types";
import { validateGeneratedArtifact } from "@/lib/validation";

export function defaultEventConfig(prompt: string): EventConfig {
  const title = prompt.match(/for\s+([^,.]+)/i)?.[1]?.trim() || "Your Event";
  return {
    title,
    subtitle: "A custom AI-generated event experience with RSVP collection.",
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

export async function generatePageArtifact(config: EventConfig, prompt: string): Promise<PageArtifact> {
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
