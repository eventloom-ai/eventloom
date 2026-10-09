import { NextRequest, NextResponse } from "next/server";
import { aiDeadline } from "@/lib/ai/deadline";
import { defaultEventConfig } from "@/lib/ai/generator";
import { generateOriginalSite } from "@/lib/agent/generate-document";
import { createEventRecord } from "@/lib/agent/tools";
import { processAndStoreEventImage } from "@/lib/event-assets";
import { refundBuildCredit, reserveBuildCredit } from "@/lib/payments/billing";
import { promptTooLong } from "@/lib/prompt-limits";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { normalizeSlugInput, suggestSlug } from "@/lib/slug-suggest";
import { createBuilderMessage, createStudioRun, seedInitialRevision, updateStudioRun } from "@/lib/studio-store";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export const maxDuration = 300;

const MAX_INITIAL_IMAGES = 5;

export async function POST(req: NextRequest) {
  const deadline = aiDeadline();
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 45 * 1024 * 1024)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const prompt = String(form.get("prompt") ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (promptTooLong(prompt)) return NextResponse.json({ error: "prompt_too_long" }, { status: 400 });
  const slugField = form.get("slug");
  const baseSlug = normalizeSlugInput((typeof slugField === "string" ? slugField : "") || suggestSlug(prompt) || "my-event");
  const slug = baseSlug.length >= 3 ? baseSlug : `event-${Date.now().toString(36)}`;
  if (isReservedSlug(slug)) return NextResponse.json({ error: "slug_reserved" }, { status: 409 });
  const imageFiles = form.getAll("images").filter((entry): entry is File => entry instanceof File).slice(0, MAX_INITIAL_IMAGES);

  let planConfig = defaultEventConfig(prompt);
  const created = await createEventRecord({ slug, config: planConfig, ownerId: user.id });
  if (!created.event) return NextResponse.json({ error: created.error?.includes("duplicate") ? "slug_taken" : created.error ?? "create_event_failed" }, { status: created.error?.includes("duplicate") ? 409 : 500 });

  if (imageFiles.length) {
    const storageClient = serviceSupabase();
    if (storageClient) {
      const urls: string[] = [];
      for (const file of imageFiles) {
        const result = await processAndStoreEventImage(storageClient, created.event.id, file);
        if ("url" in result) urls.push(result.url);
      }
      if (urls.length) planConfig = { ...planConfig, heroImageUrl: urls[0], galleryImageUrls: urls.slice(1) };
    }
  }

  // Charge only against a run row, because refunds are keyed by job id; no run means no AI and no charge.
  const runId = await createStudioRun({ eventId: created.event.id, ownerId: user.id, baseVersionId: null, prompt, selectedNodeIds: [], kind: "initial" });
  const credit = runId ? await reserveBuildCredit(user.id, created.event.id) : null;
  const charged = Boolean(runId && credit?.ok);
  const original = charged ? await generateOriginalSite(prompt, planConfig, { deadline }).catch(() => null) : null;
  const delivered = Boolean(original?.generated);
  // The credit pays for an AI-designed site; a failed or fallback generation gives it back (idempotent per run).
  if (charged && !delivered) await refundBuildCredit(user.id, created.event.id, runId!);
  const finishRun = (status: "succeeded" | "failed", error?: string) => runId
    ? updateStudioRun(runId, { status, error: error ?? null, progress_step: status === "succeeded" ? "done" : "error", progress_percent: status === "succeeded" ? 100 : 0, completed_at: new Date().toISOString() })
    : Promise.resolve();

  try {
    const revision = await seedInitialRevision(created.event, user.id, original
      ? { document: original.document, config: original.config, prompt, summary: original.summary }
      : { config: planConfig, prompt, summary: "Created the first original version" });
    await createBuilderMessage({ eventId: created.event.id, role: "user", content: prompt, versionId: revision.id, ownerId: user.id });
    await createBuilderMessage({
      eventId: created.event.id,
      role: "assistant",
      content: original?.message ?? "I created a first version from your description. Tell me what to change.",
      versionId: revision.id,
      ownerId: user.id,
    });
  } catch {
    await finishRun("failed", "studio_create_failed");
    if (delivered) await refundBuildCredit(user.id, created.event.id, runId!);
    return NextResponse.json({ error: "studio_create_failed" }, { status: 500 });
  }
  await finishRun(delivered ? "succeeded" : "failed", delivered ? undefined : credit && !credit.ok ? credit.error : "ai_fallback");
  return NextResponse.json({ eventId: created.event.id, slug, ...(credit && !credit.ok ? { warning: credit.error } : {}) }, { status: 201 });
}
