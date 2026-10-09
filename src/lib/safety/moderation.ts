import "server-only";

import { env, isProductionDeployment } from "@/lib/env";
import { reportOperationalEvent } from "@/lib/monitoring";

/**
 * Content moderation with OpenAI's free moderation endpoint (omni-moderation-latest, text and images).
 *
 * Policy (keep in step with the Acceptable Use Policy):
 * - BLOCK only the clearly prohibited categories below, and only at high confidence. Everything else passes:
 *   party copy is full of "killer playlists", "roasts" and "shots", and a false block stops a real host.
 * - FAIL OPEN: a provider error, timeout or missing key never blocks a host. The miss is logged
 *   (`moderation_unavailable`) so ops can see how much went unchecked; publish-time checks and abuse reports
 *   are the backstop.
 * - Never log the content. Logs carry the surface, the event id and the blocked category names only.
 */

export const MODERATION_MODEL = "omni-moderation-latest";
const MODERATION_URL = "https://api.openai.com/v1/moderations";
const TEXT_TIMEOUT_MS = 3_000;
const IMAGE_TIMEOUT_MS = 5_000;
// One request carries at most this many text chunks; longer pages are checked up to this length.
const TEXT_CHUNK_CHARS = 8_000;
const MAX_TEXT_CHUNKS = 4;

/** Category → minimum score that blocks. Categories not listed never block on their own. */
export const MODERATION_BLOCK_THRESHOLDS: Readonly<Record<string, number>> = {
  // Zero tolerance: block on a much lower score, and whenever the provider flags it.
  "sexual/minors": 0.3,
  // Sexually explicit material.
  sexual: 0.9,
  "hate/threatening": 0.8,
  "harassment/threatening": 0.85,
  "violence/graphic": 0.85,
  "self-harm/instructions": 0.8,
  illicit: 0.9,
  "illicit/violent": 0.8,
};

/** Categories that block whenever the provider flags them, whatever the score. */
const ALWAYS_BLOCK_WHEN_FLAGGED = new Set(["sexual/minors"]);

export type ModerationSurface = "build_brief" | "studio_create" | "studio_message" | "publish" | "image_upload";

export type ModerationVerdict =
  | { status: "allowed" }
  | { status: "blocked"; categories: string[] }
  | { status: "unavailable"; reason: string };

type ModerationContext = { surface: ModerationSurface; eventId?: string | null };

type ModerationResult = {
  flagged?: boolean;
  categories?: Record<string, boolean>;
  category_scores?: Record<string, number>;
};

/** Applies the block policy to the provider's per-input results. Exported for tests. */
export function blockedCategories(results: ModerationResult[]): string[] {
  const blocked = new Set<string>();
  for (const result of results) {
    for (const [category, threshold] of Object.entries(MODERATION_BLOCK_THRESHOLDS)) {
      const score = result.category_scores?.[category] ?? 0;
      const flagged = result.categories?.[category] === true;
      if (score >= threshold || (flagged && ALWAYS_BLOCK_WHEN_FLAGGED.has(category))) blocked.add(category);
    }
  }
  return [...blocked].sort();
}

function textChunks(input: string | string[]) {
  const joined = (Array.isArray(input) ? input : [input]).map((part) => part.trim()).filter(Boolean).join("\n");
  const chunks: string[] = [];
  for (let start = 0; start < joined.length && chunks.length < MAX_TEXT_CHUNKS; start += TEXT_CHUNK_CHARS) {
    chunks.push(joined.slice(start, start + TEXT_CHUNK_CHARS));
  }
  return chunks;
}

async function callModeration(input: unknown, timeoutMs: number, context: ModerationContext): Promise<ModerationVerdict> {
  const key = env.openaiApiKey();
  if (!key) return miss(context, "not_configured");
  let response: Response;
  try {
    response = await fetch(MODERATION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODERATION_MODEL, input }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    return miss(context, error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? "timeout" : "network_error");
  }
  if (!response.ok) return miss(context, `http_${response.status}`);
  const data = await response.json().catch(() => null) as { results?: ModerationResult[] } | null;
  if (!data || !Array.isArray(data.results) || !data.results.length) return miss(context, "invalid_response");

  const categories = blockedCategories(data.results);
  if (!categories.length) return { status: "allowed" };
  reportOperationalEvent("warn", "content_blocked", { surface: context.surface, eventId: context.eventId ?? null, categories: categories.join(",") });
  return { status: "blocked", categories };
}

function miss(context: ModerationContext, reason: string): ModerationVerdict {
  // Without a key (local demo, tests) nothing is checked; in production that is a misconfiguration worth seeing.
  if (reason !== "not_configured" || isProductionDeployment()) {
    reportOperationalEvent("warn", "moderation_unavailable", { surface: context.surface, eventId: context.eventId ?? null, reason });
  }
  return { status: "unavailable", reason };
}

/** Checks text written by a host (briefs, studio messages) or shown to guests (the published page). */
export async function moderateText(input: string | string[], context: ModerationContext): Promise<ModerationVerdict> {
  const chunks = textChunks(input);
  if (!chunks.length) return { status: "allowed" };
  return callModeration(chunks, TEXT_TIMEOUT_MS, context);
}

/** Checks one image, given as a data: URL or an https URL the provider can fetch. */
export async function moderateImage(imageUrl: string, context: ModerationContext): Promise<ModerationVerdict> {
  if (!imageUrl) return { status: "allowed" };
  return callModeration([{ type: "image_url", image_url: { url: imageUrl } }], IMAGE_TIMEOUT_MS, context);
}

/** Combines several checks of one request: blocked if any part is, otherwise unavailable if any check missed. */
export function combineVerdicts(verdicts: ModerationVerdict[]): ModerationVerdict {
  const categories = [...new Set(verdicts.flatMap((verdict) => verdict.status === "blocked" ? verdict.categories : []))].sort();
  if (categories.length) return { status: "blocked", categories };
  return verdicts.find((verdict) => verdict.status === "unavailable") ?? { status: "allowed" };
}

export function isBlocked(verdict: ModerationVerdict): verdict is { status: "blocked"; categories: string[] } {
  return verdict.status === "blocked";
}
