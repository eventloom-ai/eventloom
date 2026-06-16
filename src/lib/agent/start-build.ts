import { after } from "next/server";
import { buildCompleteSite } from "@/lib/agent/harness";
import { enrichPromptWithTheme, type ParsedBuildForm } from "@/lib/agent/parse-build-form";
import { createEventRecord, createGenerationJob, placeholderEventConfig } from "@/lib/agent/tools";

export type StartBuildResult =
  | { ok: true; jobId: string; eventId: string | null; slug: string }
  | { ok: false; error: string; status: number };

export async function startBuildJob(
  parsed: ParsedBuildForm,
  ownerId: string | null,
): Promise<StartBuildResult> {
  if (!parsed.slug || !parsed.prompt.trim()) {
    return { ok: false, error: "invalid", status: 400 };
  }

  const prompt = enrichPromptWithTheme(parsed.prompt, parsed.themeOverrides);
  let placeholderEventId = parsed.existingEventId ?? null;

  if (!placeholderEventId && ownerId) {
    const created = await createEventRecord({
      slug: parsed.slug,
      config: placeholderEventConfig(parsed.slug),
      ownerId,
    });

    if (!created.event) {
      const isDuplicate = created.error?.includes("duplicate key");
      return { ok: false, error: isDuplicate ? "slug_taken" : (created.error ?? "create_event_failed"), status: isDuplicate ? 409 : 500 };
    }

    placeholderEventId = created.event.id;
  }

  const jobId = await createGenerationJob({
    prompt,
    slug: parsed.slug,
    eventId: placeholderEventId,
    ownerId,
  });

  if (!jobId) {
    return { ok: false, error: "job_create_failed", status: 500 };
  }

  const buildInput = {
    jobId,
    prompt,
    slug: parsed.slug,
    images: parsed.images,
    templateHint: parsed.templateHint,
    themeOverrides: parsed.themeOverrides,
    existingEventId: parsed.existingEventId,
    placeholderEventId,
    ownerId,
  };

  after(async () => {
    await buildCompleteSite(buildInput);
  });

  return { ok: true, jobId, eventId: placeholderEventId, slug: parsed.slug };
}
