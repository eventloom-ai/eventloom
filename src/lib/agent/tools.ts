import type { ImageInput } from "@/lib/ai/generator";
import { generatePageArtifact } from "@/lib/ai/generator";
import { addDomainToVercelProject } from "@/lib/domains/vercel";
import { appUrl, rootDomain } from "@/lib/env";
import { serviceSupabase } from "@/lib/supabase/server";
import type { EventConfig, EventRecord, PageArtifact } from "@/lib/types";

export async function createGenerationJob(prompt: string, eventId?: string) {
  const client = serviceSupabase();
  if (!client) return null;

  const { data } = await client
    .from("generation_jobs")
    .insert({ event_id: eventId ?? null, status: "running", prompt })
    .select("id")
    .single();

  return data?.id ?? null;
}

export async function finishGenerationJob(jobId: string | null, status: "succeeded" | "failed", error?: string) {
  if (!jobId) return;
  const client = serviceSupabase();
  if (!client) return;

  await client
    .from("generation_jobs")
    .update({ status, error: error ?? null, completed_at: new Date().toISOString() })
    .eq("id", jobId);
}

export async function createEventRecord(input: {
  slug: string;
  config: EventConfig;
  ownerId?: string | null;
  publish?: boolean;
}) {
  const client = serviceSupabase();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("events")
    .insert({
      slug: input.slug,
      owner_id: input.ownerId ?? null,
      status: input.publish ? "published" : "draft",
      rsvp_open: Boolean(input.publish),
      config: input.config,
    })
    .select("id, owner_id, slug, status, rsvp_open, config")
    .single();

  if (error || !data) {
    return null;
  }

  if (input.ownerId) {
    await client.from("event_members").upsert({
      event_id: data.id,
      user_id: input.ownerId,
      role: "owner",
    });
  }

  return data as EventRecord;
}

export async function saveEventVersion(eventId: string, prompt: string, config: EventConfig, createdBy?: string | null) {
  const client = serviceSupabase();
  if (!client) return;

  await client.from("event_versions").insert({
    event_id: eventId,
    prompt,
    config,
    created_by: createdBy ?? null,
  });
}

export async function savePageArtifact(eventId: string, artifact: PageArtifact, status: "draft" | "published" = "draft") {
  const client = serviceSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from("page_artifacts")
    .insert({
      event_id: eventId,
      status,
      html: artifact.html,
      css: artifact.css,
      model: artifact.model,
      generated_at: artifact.generatedAt,
    })
    .select("id")
    .single();

  if (error) return null;
  return data.id as string;
}

export async function uploadEventImages(eventId: string, images: ImageInput[]) {
  const client = serviceSupabase();
  if (!client || !images.length) return [];

  const rows = images.map((image) => ({
    event_id: eventId,
    kind: "reference",
    url: image.dataUrl,
    metadata: { name: image.name, mediaType: image.mediaType },
  }));

  const { data } = await client.from("assets").insert(rows).select("id");
  return (data ?? []).map((row) => row.id as string);
}

export async function publishEventRecord(eventId: string) {
  const client = serviceSupabase();
  if (!client) return false;

  const { error } = await client
    .from("events")
    .update({ status: "published", rsvp_open: true, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  return !error;
}

export async function attachCustomDomain(eventId: string, domain: string) {
  const client = serviceSupabase();
  const vercel = await addDomainToVercelProject(domain);

  if (client) {
    await client.from("domains").upsert({
      event_id: eventId,
      domain,
      status: vercel.ok ? "vercel_pending" : "failed",
      failure_reason: vercel.ok ? null : vercel.error,
    });
  }

  return vercel;
}

export function previewUrls(slug: string) {
  const base = appUrl().replace(/\/$/, "");
  return {
    slugPath: `${base}/${slug}`,
    subdomain: `https://${slug}.${rootDomain()}`,
  };
}

export async function generateArtifactForConfig(config: EventConfig, prompt: string, images: ImageInput[] = []) {
  if (config.template === "wedding-rsvp") {
    return {
      generatedAt: new Date().toISOString(),
      model: "wedding-rsvp-template",
      css: "",
      html: "",
    } satisfies PageArtifact;
  }

  return generatePageArtifact(config, prompt, images);
}
