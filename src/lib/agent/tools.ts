import type { ImageInput } from "@/lib/ai/generator";
import { generatePageArtifact } from "@/lib/ai/generator";
import { progressForStep } from "@/lib/agent/build-progress";
import type { BuildJobStatus, BuildProgressEvent, BuildProgressStep } from "@/lib/agent/progress";
import { addDomainToVercelProject } from "@/lib/domains/vercel";
import { appUrl, rootDomain } from "@/lib/env";
import { createSupabaseServerClient, serviceSupabase } from "@/lib/supabase/server";
import type { EventConfig, EventRecord, EventSiteTemplate, PageArtifact } from "@/lib/types";

async function writableClient(ownerId?: string | null) {
  if (ownerId) {
    const userClient = await createSupabaseServerClient();
    if (userClient) {
      return userClient;
    }
  }

  return serviceSupabase();
}

export async function createEventRecord(input: {
  slug: string;
  config: EventConfig;
  ownerId?: string | null;
  publish?: boolean;
}): Promise<{ event: EventRecord | null; error?: string }> {
  const client = await writableClient(input.ownerId);
  if (!client) {
    return { event: null, error: "supabase_not_configured" };
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
    return { event: null, error: error?.message ?? "insert_failed" };
  }

  if (input.ownerId) {
    const { error: memberError } = await client.from("event_members").upsert({
      event_id: data.id,
      user_id: input.ownerId,
      role: "owner",
    });

    if (memberError) {
      return { event: null, error: memberError.message };
    }
  }

  return { event: data as EventRecord };
}

export async function getEventRecord(eventId: string, ownerId?: string | null): Promise<EventRecord | null> {
  const client = await writableClient(ownerId);
  if (!client) return null;

  const { data, error } = await client
    .from("events")
    .select("id, owner_id, slug, status, rsvp_open, config")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) return null;
  return data as EventRecord;
}

export async function updateEventRecord(input: {
  eventId: string;
  slug?: string;
  config: EventConfig;
  ownerId?: string | null;
}) {
  const client = await writableClient(input.ownerId);
  if (!client) return { event: null as EventRecord | null, error: "supabase_not_configured" };

  const { data, error } = await client
    .from("events")
    .update({
      ...(input.slug ? { slug: input.slug } : {}),
      config: input.config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.eventId)
    .select("id, owner_id, slug, status, rsvp_open, config")
    .single();

  if (error || !data) {
    return { event: null, error: error?.message ?? "update_failed" };
  }

  return { event: data as EventRecord };
}

export async function createGenerationJob(input: {
  prompt: string;
  slug: string;
  eventId?: string | null;
  ownerId?: string | null;
}) {
  const client = await writableClient(input.ownerId);
  if (!client) return null;

  const { data } = await client
    .from("generation_jobs")
    .insert({
      event_id: input.eventId ?? null,
      owner_id: input.ownerId ?? null,
      slug: input.slug,
      status: "running",
      prompt: input.prompt,
      progress_step: "started",
      progress_percent: progressForStep("started"),
      progress_message: "Starting your site build…",
    })
    .select("id")
    .single();

  return data?.id ?? null;
}

export async function updateGenerationJobProgress(
  jobId: string | null,
  input: {
    step: BuildProgressStep;
    message: string;
    progressPercent: number;
    eventId?: string | null;
    resultConfig?: EventConfig;
    phase?: BuildProgressEvent["phase"];
  },
  ownerId?: string | null,
) {
  if (!jobId) return;
  const client = await writableClient(ownerId);
  if (!client) return;

  await client
    .from("generation_jobs")
    .update({
      progress_step: input.step,
      progress_percent: input.progressPercent,
      progress_message: input.message,
      ...(input.eventId ? { event_id: input.eventId } : {}),
      ...(input.resultConfig ? { result_config: input.resultConfig } : {}),
    })
    .eq("id", jobId);
}

export async function getGenerationJob(jobId: string, ownerId?: string | null): Promise<BuildJobStatus | null> {
  const client = await writableClient(ownerId);
  if (!client) return null;

  const { data, error } = await client
    .from("generation_jobs")
    .select("id, status, progress_step, progress_percent, progress_message, slug, event_id, error, result_config")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !data) return null;

  const config = data.result_config as EventConfig | null;
  return {
    id: data.id as string,
    status: data.status as BuildJobStatus["status"],
    progressStep: (data.progress_step as BuildProgressStep | null) ?? null,
    progressPercent: Number(data.progress_percent ?? 0),
    progressMessage: (data.progress_message as string | null) ?? null,
    slug: (data.slug as string | null) ?? null,
    eventId: (data.event_id as string | null) ?? null,
    error: (data.error as string | null) ?? null,
    resultConfig: config,
    template: config?.template ?? null,
  };
}

export async function listActiveGenerationJobs(ownerId: string): Promise<BuildJobStatus[]> {
  const client = await writableClient(ownerId);
  if (!client) return [];

  const { data } = await client
    .from("generation_jobs")
    .select("id, status, progress_step, progress_percent, progress_message, slug, event_id, error, result_config")
    .eq("owner_id", ownerId)
    .eq("status", "running")
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []).map((row) => {
    const config = row.result_config as EventConfig | null;
    return {
      id: row.id as string,
      status: row.status as BuildJobStatus["status"],
      progressStep: (row.progress_step as BuildProgressStep | null) ?? null,
      progressPercent: Number(row.progress_percent ?? 0),
      progressMessage: (row.progress_message as string | null) ?? null,
      slug: (row.slug as string | null) ?? null,
      eventId: (row.event_id as string | null) ?? null,
      error: (row.error as string | null) ?? null,
      resultConfig: config,
      template: config?.template ?? null,
    };
  });
}

export function placeholderEventConfig(slug: string): EventConfig {
  const title = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: title || "Your event",
    subtitle: "Your site is being created…",
    eventType: "celebration",
    date: "",
    venueName: "Details coming soon",
    schedule: [],
    rsvpFields: ["name", "attendance", "party_size", "guest_names", "note"],
    theme: {
      mood: "building",
      colors: ["#1f1a17", "#f7f2ed", "#6f3032", "#747d5c"],
      fontPairing: "romantic serif with clean sans",
    },
    template: "wedding-rsvp",
  };
}

export async function finishGenerationJob(jobId: string | null, status: "succeeded" | "failed", error?: string, ownerId?: string | null) {
  if (!jobId) return;
  const client = await writableClient(ownerId);
  if (!client) return;

  await client
    .from("generation_jobs")
    .update({
      status,
      error: error ?? null,
      completed_at: new Date().toISOString(),
      ...(status === "succeeded" ? { progress_step: "done", progress_percent: 100, progress_message: "Your site is ready." } : {}),
    })
    .eq("id", jobId);
}

export async function saveEventVersion(
  eventId: string,
  prompt: string,
  config: EventConfig,
  createdBy?: string | null,
) {
  const client = await writableClient(createdBy);
  if (!client) return;

  await client.from("event_versions").insert({
    event_id: eventId,
    prompt,
    config,
    created_by: createdBy ?? null,
  });
}

export async function savePageArtifact(
  eventId: string,
  artifact: PageArtifact,
  status: "draft" | "published" = "draft",
  ownerId?: string | null,
) {
  const client = await writableClient(ownerId);
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

export async function updateEventConfig(eventId: string, config: EventConfig, ownerId?: string | null) {
  const client = await writableClient(ownerId);
  if (!client) return false;

  const { error } = await client
    .from("events")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  return !error;
}

export async function uploadEventImages(eventId: string, images: ImageInput[], ownerId?: string | null) {
  const client = await writableClient(ownerId);
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
