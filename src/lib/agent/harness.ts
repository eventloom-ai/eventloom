import type { ImageInput } from "@/lib/ai/generator";
import { generateSitePlan } from "@/lib/agent/generate-config";
import type { BuildProgressReporter } from "@/lib/agent/progress";
import { getAgentRuntime } from "@/lib/agent/runtime";
import { normalizeGeneratedConfig } from "@/lib/template-policy";
import {
  createEventRecord,
  createGenerationJob,
  finishGenerationJob,
  generateArtifactForConfig,
  previewUrls,
  publishEventRecord,
  saveEventVersion,
  savePageArtifact,
  uploadEventImages,
} from "@/lib/agent/tools";
import type { EventRecord } from "@/lib/types";

export type BuildSiteInput = {
  prompt: string;
  slug: string;
  images?: ImageInput[];
  ownerId?: string | null;
  publish?: boolean;
  templateHint?: "wedding" | "custom";
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

async function report(onProgress: BuildProgressReporter | undefined, event: Parameters<BuildProgressReporter>[0]) {
  if (onProgress) {
    await onProgress(event);
  }
}

export async function buildCompleteSite(input: BuildSiteInput): Promise<BuildSiteResult> {
  const runtime = getAgentRuntime();
  const jobId = await createGenerationJob(input.prompt, undefined, input.ownerId);

  try {
    await report(input.onProgress, { step: "started", message: "Starting your site build…" });
    await report(input.onProgress, { step: "planning", message: "Understanding your event and choosing a template…" });

    const plan = await generateSitePlan(input.prompt);
    const config = normalizeGeneratedConfig(
      input.templateHint === "wedding"
        ? { ...plan.config, template: "wedding-rsvp", eventType: "wedding" }
        : plan.config,
      input.prompt,
    );
    const template = config.template ?? plan.template;

    await report(input.onProgress, {
      step: "planned",
      message: template === "wedding-rsvp" ? "Premium celebration template selected." : "Custom layout planned.",
      template,
      config,
    });

    await report(input.onProgress, { step: "generating", message: "Generating your page content…" });
    const artifact = await generateArtifactForConfig(config, input.prompt, input.images ?? []);
    await report(input.onProgress, {
      step: "generating",
      message: "Page content ready.",
      model: artifact.model,
    });

    if (!runtime.capabilities.persist_events) {
      await finishGenerationJob(jobId, "succeeded", undefined, input.ownerId);
      await report(input.onProgress, {
        step: "done",
        message: "Preview ready in demo mode.",
        eventId: `demo-${input.slug}`,
        slug: input.slug,
        previewUrl: previewUrls(input.slug).slugPath,
        template,
        config,
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

    await report(input.onProgress, { step: "saving", message: "Saving your event, RSVP settings, and first version…" });

    const created = await createEventRecord({
      slug: input.slug,
      config,
      ownerId: input.ownerId,
      publish: input.publish,
    });

    if (!created.event) {
      const message = created.error ?? "create_event_failed";
      await finishGenerationJob(jobId, "failed", message, input.ownerId);
      await report(input.onProgress, { step: "error", message });
      return { ok: false, error: message, runtime };
    }

    const event = created.event;

    await saveEventVersion(event.id, input.prompt, config, input.ownerId ?? null);
    await savePageArtifact(event.id, artifact, input.publish ? "published" : "draft", input.ownerId ?? null);
    await uploadEventImages(event.id, input.images ?? [], input.ownerId ?? null);

    if (input.publish) {
      await publishEventRecord(event.id);
    }

    await finishGenerationJob(jobId, "succeeded", undefined, input.ownerId);

    const preview = previewUrls(input.slug);
    await report(input.onProgress, {
      step: "done",
      message: "Your site is ready.",
      eventId: event.id,
      slug: event.slug,
      previewUrl: preview.slugPath,
      template,
      config,
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
    await finishGenerationJob(jobId, "failed", message, input.ownerId);
    await report(input.onProgress, { step: "error", message });
    return { ok: false, error: message, runtime };
  }
}
