import type { ImageInput } from "@/lib/ai/generator";
import { artDirectEvent } from "@/lib/agent/art-director";
import { generateSitePlan } from "@/lib/agent/generate-config";
import { progressForStep } from "@/lib/agent/build-progress";
import type { BuildProgressEvent, BuildProgressReporter } from "@/lib/agent/progress";
import { applyImagesToConfig } from "@/lib/agent/parse-build-form";
import { getAgentRuntime } from "@/lib/agent/runtime";
import { saveLocalDemoEvent } from "@/lib/local-demo-store";
import { settleBuildCredit } from "@/lib/payments/ai-credit-rule";
import { composeSiteDocument } from "@/lib/site-document";
import { seedInitialRevision } from "@/lib/studio-store";
import type { ThemeOverrides } from "@/lib/event-theme";
import { normalizeGeneratedConfig } from "@/lib/template-policy";
import {
  createEventRecord,
  discardPlaceholderEvent,
  finishGenerationJob,
  getEventRecord,
  previewUrls,
  publishEventRecord,
  saveEventVersion,
  updateEventConfig,
  updateEventRecord,
  updateGenerationJobProgress,
  uploadEventImages,
} from "@/lib/agent/tools";
import type { EventRecord } from "@/lib/types";

export type BuildSiteInput = {
  jobId: string;
  prompt: string;
  slug: string;
  images?: ImageInput[];
  ownerId?: string | null;
  publish?: boolean;
  themeOverrides?: ThemeOverrides;
  existingEventId?: string;
  placeholderEventId?: string | null;
  // Absolute time by which every provider call must be done (see aiDeadline); unset means only the per-call cap applies.
  deadline?: number;
  onProgress?: BuildProgressReporter;
};

export type BuildSiteResult =
  | {
      ok: true;
      mode: "production" | "demo";
      event: EventRecord;
      preview: { slugPath: string; subdomain: string };
      runtime: ReturnType<typeof getAgentRuntime>;
    }
  | {
      ok: false;
      error: string;
      runtime: ReturnType<typeof getAgentRuntime>;
    };

async function report(
  input: BuildSiteInput,
  event: BuildProgressEvent,
) {
  const progressPercent = event.progressPercent ?? progressForStep(event.step, "phase" in event ? event.phase : undefined);
  const payload = {
    ...event,
    progressPercent,
    jobId: input.jobId,
    eventId: input.placeholderEventId ?? input.existingEventId ?? event.eventId ?? null,
  } as BuildProgressEvent;

  await updateGenerationJobProgress(
    input.jobId,
    {
      step: payload.step,
      message: payload.message,
      progressPercent,
      eventId: payload.eventId,
      phase: "phase" in payload ? payload.phase : undefined,
      resultConfig: payload.step === "planned" || payload.step === "done" ? payload.config : undefined,
    },
    input.ownerId,
  );

  if (input.onProgress) {
    await input.onProgress(payload);
  }
}

async function quietly(task: () => unknown) {
  try {
    await task();
  } catch {
    // Best effort: bookkeeping failures must not mask the build outcome.
  }
}

// A failed build delivered no site, so its credit goes back (refunds are idempotent per job), and the empty
// placeholder draft of a first build is removed so it doesn't linger in the dashboard or hold the slug.
async function failBuild(input: BuildSiteInput, message: string, runtime: ReturnType<typeof getAgentRuntime>): Promise<BuildSiteResult> {
  const placeholderToDiscard = input.ownerId && input.placeholderEventId && !input.existingEventId ? input.placeholderEventId : null;
  await quietly(() => finishGenerationJob(input.jobId, "failed", message, input.ownerId));
  // A ledger row pointing at the placeholder would block deleting it, so that refund is recorded without an event.
  const refundEventId = placeholderToDiscard ? null : input.placeholderEventId ?? input.existingEventId ?? null;
  if (input.ownerId) await quietly(() => settleBuildCredit(input.ownerId!, refundEventId, input.jobId, { status: "failed", aiResultShown: false }));
  await quietly(() => report(input, { step: "error", message, progressPercent: 0 }));
  if (placeholderToDiscard) await quietly(() => discardPlaceholderEvent(placeholderToDiscard, input.ownerId!));
  return { ok: false, error: message, runtime };
}

// The credit pays for AI work: a build where the planner and the art director both fell back to deterministic
// output delivered a site but no AI result, so its credit goes back too.
async function settleDeliveredBuild(input: BuildSiteInput, eventId: string | null, aiGenerated: boolean) {
  if (input.ownerId) await quietly(() => settleBuildCredit(input.ownerId!, eventId, input.jobId, { status: "succeeded", aiGenerated }));
}

export async function buildCompleteSite(input: BuildSiteInput): Promise<BuildSiteResult> {
  const runtime = getAgentRuntime();

  try {
    await report(input, { step: "started", message: "Starting your site build…", progressPercent: progressForStep("started") });
    await report(input, { step: "planning", message: "Understanding your event and shaping a unique direction…", progressPercent: progressForStep("planning") });

    // Two provider calls share the build's time budget: the planner here and the art director below.
    const plan = await generateSitePlan(input.prompt, input.themeOverrides, { deadline: input.deadline, callsLeft: 2 });
    const existingEvent = input.existingEventId ? await getEventRecord(input.existingEventId, input.ownerId) : null;
    let config = normalizeGeneratedConfig(plan.config, input.prompt, input.themeOverrides);
    config = applyImagesToConfig(config, input.images ?? []);
    if (!input.images?.length && existingEvent?.config.heroImageUrl) {
      config = {
        ...config,
        heroImageUrl: existingEvent.config.heroImageUrl,
        galleryImageUrls: existingEvent.config.galleryImageUrls,
      };
    }
    const template = "custom" as const;

    await report(input, {
      step: "planned",
      message: "A unique visual direction is ready.",
      template,
      config,
      progressPercent: progressForStep("planned"),
    });

    // Published pages render the structured site document, so compose it from the plan instead of generating a separate HTML artifact.
    await report(input, { step: "generating", message: "Composing your page…", progressPercent: progressForStep("generating") });
    // Reference photos arrive as data: URLs, which site documents reject; they stay on the config only.
    const documentImage = config.heroImageUrl && /^(?:https:\/\/|\/)/i.test(config.heroImageUrl) ? config.heroImageUrl : undefined;
    // New events render through the approved design system: the art director picks a style, palette and copy
    // (deterministic fallback without a provider). The composed site document stays as the legacy fallback.
    const art = await artDirectEvent({ prompt: input.prompt, config, mood: input.themeOverrides?.mood, hasPhotos: Boolean(documentImage), deadline: input.deadline });
    config = { ...config, design: art.design };
    const document = composeSiteDocument({ ...config, heroImageUrl: documentImage }, input.prompt);
    await report(input, {
      step: "generating",
      phase: "content_ready",
      message: "Page content ready.",
      progressPercent: progressForStep("generating", "content_ready"),
    });

    if (!runtime.capabilities.persist_events) {
      const event: EventRecord = {
        id: input.existingEventId ?? `demo-${input.slug}`,
        slug: input.slug,
        status: "draft",
        rsvp_open: false,
        config,
        document,
      };
      saveLocalDemoEvent(event);
      await report(input, {
        step: "done",
        message: "Preview ready in demo mode.",
        eventId: `demo-${input.slug}`,
        slug: input.slug,
        previewUrl: previewUrls(input.slug).slugPath,
        template,
        config,
        progressPercent: 100,
      });
      await finishGenerationJob(input.jobId, "succeeded", undefined, input.ownerId);
      await settleDeliveredBuild(input, null, plan.generated || art.generated);
      return {
        ok: true,
        mode: "demo",
        event,
        preview: previewUrls(input.slug),
        runtime,
      };
    }

    await report(input, {
      step: "saving",
      message: input.existingEventId ? "Updating your site…" : "Saving your event…",
      progressPercent: progressForStep("saving"),
    });

    let event: EventRecord;

    if (input.existingEventId) {
      if (!existingEvent) {
        const message = "event_not_found";
        return failBuild(input, message, runtime);
      }

      const updated = await updateEventRecord({
        eventId: existingEvent.id,
        slug: input.slug !== existingEvent.slug ? input.slug : undefined,
        config,
        ownerId: input.ownerId,
      });

      if (!updated.event) {
        const message = updated.error ?? "update_event_failed";
        return failBuild(input, message, runtime);
      }

      event = updated.event;
    } else if (input.placeholderEventId) {
      const updated = await updateEventRecord({
        eventId: input.placeholderEventId,
        slug: input.slug,
        config,
        ownerId: input.ownerId,
      });

      if (!updated.event) {
        const message = updated.error ?? "update_event_failed";
        return failBuild(input, message, runtime);
      }

      event = updated.event;
    } else {
      const created = await createEventRecord({
        slug: input.slug,
        config,
        ownerId: input.ownerId,
        publish: input.publish,
      });

      if (!created.event) {
        const message = created.error ?? "create_event_failed";
        return failBuild(input, message, runtime);
      }

      event = created.event;
    }

    await report(input, { step: "saving", phase: "event_saved", message: "Event saved. Writing version history…", progressPercent: progressForStep("saving", "event_saved") });

    if (input.existingEventId) await saveEventVersion(event.id, input.prompt, config, input.ownerId ?? null);
    else await seedInitialRevision(event, input.ownerId ?? null, { document, config, prompt: input.prompt, summary: "Created the first original version" });
    await report(input, { step: "saving", phase: "version_saved", message: "Saving images…", progressPercent: progressForStep("saving", "version_saved") });

    await uploadEventImages(event.id, input.images ?? [], input.ownerId ?? null);
    await updateEventConfig(event.id, config, input.ownerId ?? null);

    await report(input, { step: "saving", phase: "images_saved", message: "Finalizing your site…", progressPercent: progressForStep("saving", "images_saved") });

    if (input.publish) {
      await publishEventRecord(event.id);
    }

    await report(input, { step: "saving", phase: "finalizing", message: "Almost ready…", progressPercent: progressForStep("saving", "finalizing") });
    await finishGenerationJob(input.jobId, "succeeded", undefined, input.ownerId);
    await settleDeliveredBuild(input, event.id, plan.generated || art.generated);

    const preview = previewUrls(event.slug);
    // The site is saved and the job succeeded; a lost progress update must not fail (and refund) a delivered build.
    await quietly(() => report(input, {
      step: "done",
      message: "Your site is ready.",
      eventId: event.id,
      slug: event.slug,
      previewUrl: preview.slugPath,
      template,
      config,
      progressPercent: 100,
    }));

    return {
      ok: true,
      mode: "production",
      event: { ...event, document },
      preview,
      runtime,
    };
  } catch (error) {
    return failBuild(input, error instanceof Error ? error.message : "build_failed", runtime);
  }
}
