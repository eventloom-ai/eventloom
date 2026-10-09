import { after } from "next/server";
import { buildCompleteSite } from "@/lib/agent/harness";
import { enrichPromptWithTheme, type ParsedBuildForm } from "@/lib/agent/parse-build-form";
import { progressForStep } from "@/lib/agent/build-progress";
import { createEventRecord, createGenerationJob, finishGenerationJob, placeholderEventConfig, updateGenerationJobProgress } from "@/lib/agent/tools";
import { aiDeadline } from "@/lib/ai/deadline";
import type { ImageInput } from "@/lib/ai/generator";
import { processAndStoreEventImage } from "@/lib/event-assets";
import { isEventOwner, refundBuildCredit, reserveBuildCredit } from "@/lib/payments/billing";
import { reapStaleGenerationJobs } from "@/lib/studio-store";
import { serviceSupabase } from "@/lib/supabase/server";

export type StartBuildResult =
  | { ok: true; jobId: string; eventId: string | null; slug: string }
  | { ok: false; error: string; status: number };

// Store reference photos as private event assets so the site document gets an /api/assets URL
// instead of an inline data URL (which the document schema rejects). Unstorable images keep their data URL.
export async function storeReferenceImages(eventId: string, images: ImageInput[]): Promise<ImageInput[]> {
  const client = serviceSupabase();
  if (!client || !images.length) return images;
  return Promise.all(images.map(async (image) => {
    const match = /^data:([^;,]+);base64,(.+)$/.exec(image.dataUrl);
    if (!match) return image;
    const stored = await processAndStoreEventImage(client, eventId, new File([Buffer.from(match[2], "base64")], image.name || "reference", { type: match[1] }));
    return "url" in stored ? { ...image, storedUrl: stored.url } : image;
  }));
}

export async function startBuildJob(
  parsed: ParsedBuildForm,
  ownerId: string | null,
  // When the request began: the build runs in after() of the same invocation, so it shares the route's time budget.
  startedAt = Date.now(),
): Promise<StartBuildResult> {
  if (parsed.slugReserved) return { ok: false, error: "slug_reserved", status: 409 };
  if (parsed.promptTooLong) return { ok: false, error: "prompt_too_long", status: 400 };
  if (!parsed.slug || !parsed.prompt.trim()) {
    return { ok: false, error: "invalid", status: 400 };
  }

  if (ownerId && parsed.existingEventId && !(await isEventOwner(parsed.existingEventId, ownerId))) {
    return { ok: false, error: "not_found", status: 404 };
  }

  if (ownerId) {
    // A dead worker leaves its job "running", which blocks new builds on the event until the daily cron.
    await reapStaleGenerationJobs(parsed.existingEventId ? { eventId: parsed.existingEventId } : { ownerId });
  }

  const prompt = enrichPromptWithTheme(parsed.prompt, parsed.themeOverrides);
  // Create the job before charging: refunds are keyed by job id, so a credit is only ever reserved against a job that can return it.
  const jobId = await createGenerationJob({
    prompt,
    slug: parsed.slug,
    eventId: parsed.existingEventId ?? null,
    ownerId,
  });

  if (!jobId) {
    return { ok: false, error: "job_create_failed", status: 500 };
  }

  if (ownerId) {
    const credit = await reserveBuildCredit(ownerId, parsed.existingEventId);
    if (!credit.ok) {
      await finishGenerationJob(jobId, "failed", credit.error, ownerId);
      return { ok: false, error: credit.error, status: 402 };
    }
  }

  let placeholderEventId = parsed.existingEventId ?? null;

  if (!placeholderEventId && ownerId) {
    const created = await createEventRecord({
      slug: parsed.slug,
      config: placeholderEventConfig(parsed.slug),
      ownerId,
    });

    if (!created.event) {
      const isDuplicate = created.error?.includes("duplicate key");
      const error = isDuplicate ? "slug_taken" : (created.error ?? "create_event_failed");
      await finishGenerationJob(jobId, "failed", error, ownerId);
      await refundBuildCredit(ownerId, null, jobId);
      return { ok: false, error, status: isDuplicate ? 409 : 500 };
    }

    placeholderEventId = created.event.id;
    await updateGenerationJobProgress(jobId, { step: "started", message: "Starting your site build…", progressPercent: progressForStep("started"), eventId: placeholderEventId }, ownerId);
  }

  const images = ownerId && placeholderEventId ? await storeReferenceImages(placeholderEventId, parsed.images) : parsed.images;

  const buildInput = {
    jobId,
    prompt,
    slug: parsed.slug,
    images,
    themeOverrides: parsed.themeOverrides,
    existingEventId: parsed.existingEventId,
    placeholderEventId,
    ownerId,
    deadline: aiDeadline(startedAt),
  };

  after(async () => {
    await buildCompleteSite(buildInput);
  });

  return { ok: true, jobId, eventId: placeholderEventId, slug: parsed.slug };
}
