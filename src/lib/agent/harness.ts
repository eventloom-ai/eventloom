import type { ImageInput } from "@/lib/ai/generator";
import { generateSitePlan } from "@/lib/agent/generate-config";
import { getAgentRuntime } from "@/lib/agent/runtime";
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

export async function buildCompleteSite(input: BuildSiteInput): Promise<BuildSiteResult> {
  const runtime = getAgentRuntime();
  const jobId = await createGenerationJob(input.prompt, undefined, input.ownerId);

  try {
    const plan = await generateSitePlan(input.prompt);
    const config =
      input.templateHint === "wedding"
        ? { ...plan.config, template: "wedding-rsvp" as const, eventType: "wedding" }
        : plan.config;

    const artifact = await generateArtifactForConfig(config, input.prompt, input.images ?? []);

    if (!runtime.capabilities.persist_events) {
      await finishGenerationJob(jobId, "succeeded", undefined, input.ownerId);
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

    const created = await createEventRecord({
      slug: input.slug,
      config,
      ownerId: input.ownerId,
      publish: input.publish,
    });

    if (!created.event) {
      const message = created.error ?? "create_event_failed";
      await finishGenerationJob(jobId, "failed", message, input.ownerId);
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

    return {
      ok: true,
      mode: "production",
      event: { ...event, artifact },
      preview: previewUrls(input.slug),
      runtime,
      artifactModel: artifact.model,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "build_failed";
    await finishGenerationJob(jobId, "failed", message, input.ownerId);
    return { ok: false, error: message, runtime };
  }
}
