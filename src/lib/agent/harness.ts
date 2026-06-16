import type { ImageInput } from "@/lib/ai/generator";
import { generateSitePlan } from "@/lib/agent/generate-config";
import { progressForStep } from "@/lib/agent/build-progress";
import type { BuildProgressEvent, BuildProgressReporter } from "@/lib/agent/progress";
import { applyImagesToConfig } from "@/lib/agent/parse-build-form";
import { getAgentRuntime } from "@/lib/agent/runtime";
import type { ThemeOverrides } from "@/lib/event-theme";
import { normalizeGeneratedConfig } from "@/lib/template-policy";
import {
  createEventRecord,
  finishGenerationJob,
  generateArtifactForConfig,
  getEventRecord,
  previewUrls,
  publishEventRecord,
  saveEventVersion,
  savePageArtifact,
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
  templateHint?: "wedding" | "custom";
  themeOverrides?: ThemeOverrides;
  existingEventId?: string;
  placeholderEventId?: string | null;
  onProgress?: BuildProgressReporter;
};

export type BuildSiteResult =
  | {
      ok: true;
      mode: "production" | "demo";
      event: EventRecord;
      preview: { slugPath: string; subdomain: string };
      runtime: ReturnType<typeof getAgentRuntime>;
      artifactModel: string;
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
      eventId: input.placeholderEventId ?? input.existingEventId ?? null,
      phase: "phase" in payload ? payload.phase : undefined,
      resultConfig: payload.step === "planned" || payload.step === "done" ? payload.config : undefined,
    },
    input.ownerId,
  );

  if (input.onProgress) {
    await input.onProgress(payload);
  }
}

export async function buildCompleteSite(input: BuildSiteInput): Promise<BuildSiteResult> {
  const runtime = getAgentRuntime();

  try {
    await report(input, { step: "started", message: "Starting your site build…", progressPercent: progressForStep("started") });
    await report(input, { step: "planning", message: "Understanding your event and choosing a template…", progressPercent: progressForStep("planning") });

    const plan = await generateSitePlan(input.prompt, input.themeOverrides);
    const existingEvent = input.existingEventId ? await getEventRecord(input.existingEventId, input.ownerId) : null;
    let config = normalizeGeneratedConfig(
      input.templateHint === "wedding"
        ? { ...plan.config, template: "wedding-rsvp", eventType: "wedding" }
        : plan.config,
      input.prompt,
      input.themeOverrides,
    );
    config = applyImagesToConfig(config, input.images ?? []);
    if (!input.images?.length && existingEvent?.config.heroImageUrl) {
      config = {
        ...config,
        heroImageUrl: existingEvent.config.heroImageUrl,
        galleryImageUrls: existingEvent.config.galleryImageUrls,
      };
    }
    const template = config.template ?? plan.template;

    await report(input, {
      step: "planned",
      message: template === "wedding-rsvp" ? "Premium celebration template selected." : "Custom layout planned.",
      template,
      config,
      progressPercent: progressForStep("planned"),
    });

    await report(input, { step: "generating", message: "Generating your page content…", progressPercent: progressForStep("generating") });
    const artifact = await generateArtifactForConfig(config, input.prompt, input.images ?? []);
    await report(input, {
      step: "generating",
      phase: "content_ready",
      message: "Page content ready.",
      model: artifact.model,
      progressPercent: progressForStep("generating", "content_ready"),
    });

    if (!runtime.capabilities.persist_events) {
      await finishGenerationJob(input.jobId, "succeeded", undefined, input.ownerId);
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
      return {
        ok: true,
        mode: "demo",
        event: {
          id: `demo-${input.slug}`,
          slug: input.slug,
          status: input.publish ? "published" : "draft",
          rsvp_open: Boolean(input.publish),
          config,
          artifact,
        },
        preview: previewUrls(input.slug),
        runtime,
        artifactModel: artifact.model,
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
        await finishGenerationJob(input.jobId, "failed", message, input.ownerId);
        await report(input, { step: "error", message, progressPercent: 0 });
        return { ok: false, error: message, runtime };
      }

      const updated = await updateEventRecord({
        eventId: existingEvent.id,
        slug: input.slug !== existingEvent.slug ? input.slug : undefined,
        config,
        ownerId: input.ownerId,
      });

      if (!updated.event) {
        const message = updated.error ?? "update_event_failed";
        await finishGenerationJob(input.jobId, "failed", message, input.ownerId);
        await report(input, { step: "error", message, progressPercent: 0 });
        return { ok: false, error: message, runtime };
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
        await finishGenerationJob(input.jobId, "failed", message, input.ownerId);
        await report(input, { step: "error", message, progressPercent: 0 });
        return { ok: false, error: message, runtime };
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
        await finishGenerationJob(input.jobId, "failed", message, input.ownerId);
        await report(input, { step: "error", message, progressPercent: 0 });
        return { ok: false, error: message, runtime };
      }

      event = created.event;
    }

    await report(input, { step: "saving", phase: "event_saved", message: "Event saved. Writing version history…", progressPercent: progressForStep("saving", "event_saved") });

    await saveEventVersion(event.id, input.prompt, config, input.ownerId ?? null);
    await report(input, { step: "saving", phase: "version_saved", message: "Saving page content and images…", progressPercent: progressForStep("saving", "version_saved") });

    await savePageArtifact(event.id, artifact, input.publish ? "published" : "draft", input.ownerId ?? null);
    await uploadEventImages(event.id, input.images ?? [], input.ownerId ?? null);
    await updateEventConfig(event.id, config, input.ownerId ?? null);

    await report(input, { step: "saving", phase: "images_saved", message: "Finalizing your site…", progressPercent: progressForStep("saving", "images_saved") });

    if (input.publish) {
      await publishEventRecord(event.id);
    }

    await report(input, { step: "saving", phase: "finalizing", message: "Almost ready…", progressPercent: progressForStep("saving", "finalizing") });
    await finishGenerationJob(input.jobId, "succeeded", undefined, input.ownerId);

    const preview = previewUrls(event.slug);
    await report(input, {
      step: "done",
      message: "Your site is ready.",
      eventId: event.id,
      slug: event.slug,
      previewUrl: preview.slugPath,
      template,
      config,
      progressPercent: 100,
    });

    return {
      ok: true,
      mode: "production",
      event: { ...event, artifact },
      preview,
      runtime,
      artifactModel: artifact.model,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "build_failed";
    await finishGenerationJob(input.jobId, "failed", message, input.ownerId);
    await report(input, { step: "error", message, progressPercent: 0 });
    return { ok: false, error: message, runtime };
  }
}
