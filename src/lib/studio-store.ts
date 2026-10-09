import "server-only";

import { assertEventAssetOwnership, composeSiteDocument, siteDocumentSchema, type SiteDocument } from "@/lib/site-document";
import { getLocalDemoEventById, getLocalDemoRevisions, saveLocalDemoEvent, saveLocalDemoRevision } from "@/lib/local-demo-store";
import { refundBuildCredit } from "@/lib/payments/billing";
import { demoEvents } from "@/lib/sample-data";
import { serviceSupabase } from "@/lib/supabase/server";
import type { BuilderMessage, BuilderRunEvent, EventConfig, EventRecord, SiteRevision } from "@/lib/types";

export type StudioRun = {
  id: string;
  event_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  kind: "initial" | "edit" | "upgrade";
  base_version_id: string | null;
  result_version_id: string | null;
  cancel_requested: boolean;
  progress_message: string | null;
  error: string | null;
};

export type StudioState = {
  event: EventRecord;
  revision: SiteRevision;
  versions: SiteRevision[];
  messages: BuilderMessage[];
  activeRun: StudioRun | null;
  persistence: "database" | "demo";
};

export const STALE_JOB_MS = 10 * 60 * 1000;

const unsafeImageUrl = (value: string | undefined) => Boolean(value) && !(value!.startsWith("/") || /^https:\/\//i.test(value!));

// Builds can carry inline `data:` reference photos in the config, which the site document rejects.
// Seed without them instead of failing the studio forever.
export function composeSeedDocument(config: EventConfig, prompt: string, makeId?: (prefix: string) => string) {
  try {
    return { document: composeSiteDocument(config, prompt, makeId), config };
  } catch (error) {
    if (!unsafeImageUrl(config.heroImageUrl) && !config.galleryImageUrls?.some(unsafeImageUrl)) throw error;
    const { heroImageUrl, galleryImageUrls, ...rest } = config;
    const safe: EventConfig = { ...rest, ...(unsafeImageUrl(heroImageUrl) ? {} : { heroImageUrl }), ...(galleryImageUrls ? { galleryImageUrls: galleryImageUrls.filter((url) => !unsafeImageUrl(url)) } : {}) };
    return { document: composeSiteDocument(safe, prompt, makeId), config: safe };
  }
}

function demoRevision(event: EventRecord): SiteRevision {
  const eventKey = event.id.replaceAll("-", "").slice(0, 10);
  const seeded = composeSeedDocument(event.config, event.config.title, (prefix) => `${prefix}_${eventKey}`);
  return {
    id: `demo-version-${event.id}`,
    event_id: event.id,
    parent_version_id: null,
    source: "initial",
    summary: "First original version",
    prompt: event.config.title,
    config: seeded.config,
    document: seeded.document,
    created_at: new Date(0).toISOString(),
  };
}

export async function canEditEvent(eventId: string, userId: string | null) {
  const client = serviceSupabase();
  if (!client) return true;
  if (!userId) return false;
  const { data } = await client
    .from("event_members")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .in("role", ["owner", "editor"])
    .maybeSingle();
  if (data) return true;
  const { data: event } = await client.from("events").select("owner_id").eq("id", eventId).maybeSingle();
  return event?.owner_id === userId;
}

function revisionFromRow(row: Record<string, unknown>): SiteRevision | null {
  const parsed = siteDocumentSchema.safeParse(row.document);
  if (!parsed.success) return null;
  return {
    id: String(row.id),
    event_id: String(row.event_id),
    parent_version_id: typeof row.parent_version_id === "string" ? row.parent_version_id : null,
    source: (row.source as SiteRevision["source"]) ?? "legacy",
    summary: typeof row.summary === "string" ? row.summary : "",
    prompt: String(row.prompt ?? ""),
    config: row.config as EventConfig,
    document: parsed.data,
    created_at: String(row.created_at),
  };
}

export async function seedInitialRevision(event: EventRecord, ownerId: string | null, seed?: {
  document?: SiteDocument;
  config?: EventConfig;
  prompt?: string;
  summary?: string;
}) {
  const client = serviceSupabase();
  const prompt = seed?.prompt ?? event.config.title;
  const { document, config } = seed?.document ? { document: seed.document, config: seed.config ?? event.config } : composeSeedDocument(seed?.config ?? event.config, prompt);
  if (!client) {
    const revision = { ...demoRevision({ ...event, config }), document, config, prompt, summary: seed?.summary ?? "First original version" };
    saveLocalDemoRevision(revision);
    return revision;
  }
  const { data, error } = await client.from("event_versions").insert({
    event_id: event.id,
    prompt,
    config,
    document,
    source: "initial",
    summary: seed?.summary ?? "Created the first original version",
    created_by: ownerId,
  }).select("id, event_id, parent_version_id, source, summary, prompt, config, document, created_at").single();
  if (error || !data) return demoRevision({ ...event, config });
  const { data: claimed } = await client.from("events").update({ config, draft_version_id: data.id }).eq("id", event.id).is("draft_version_id", null).select("id").maybeSingle();
  if (claimed) return revisionFromRow(data as Record<string, unknown>) ?? demoRevision({ ...event, config });

  // Another request initialized the draft first. Remove this orphan and use the winner.
  await client.from("event_versions").delete().eq("id", data.id);
  const { data: winnerEvent } = await client.from("events").select("draft_version_id").eq("id", event.id).maybeSingle();
  if (winnerEvent?.draft_version_id) {
    const { data: winner } = await client.from("event_versions").select("id, event_id, parent_version_id, source, summary, prompt, config, document, created_at").eq("id", winnerEvent.draft_version_id).maybeSingle();
    const revision = winner ? revisionFromRow(winner as Record<string, unknown>) : null;
    if (revision) return revision;
  }
  return demoRevision({ ...event, config });
}

export async function loadStudioState(eventId: string, ownerId: string | null): Promise<StudioState | null> {
  const client = serviceSupabase();
  if (!client) {
    const found = getLocalDemoEventById(eventId) ?? demoEvents.find((item) => item.id === eventId) ?? demoEvents[0];
    if (!found) return null;
    const event = { ...found, id: eventId };
    const saved = getLocalDemoRevisions(eventId);
    const revision = saved[0] ?? demoRevision(event);
    return { event: { ...event, config: revision.config, document: revision.document, draft_version_id: revision.id }, revision, versions: saved.length ? saved : [revision], messages: [], activeRun: null, persistence: "demo" };
  }

  const full = await client.from("events").select("id, owner_id, slug, status, rsvp_open, config, draft_version_id, published_version_id").eq("id", eventId).maybeSingle();
  let eventRow = full.data;
  if (!eventRow) {
    const legacy = await client.from("events").select("id, owner_id, slug, status, rsvp_open, config").eq("id", eventId).maybeSingle();
    eventRow = legacy.data ? { ...legacy.data, draft_version_id: null, published_version_id: null } : null;
  }
  if (!eventRow) return null;

  const event = eventRow as EventRecord;
  let revision: SiteRevision | null = null;
  if (event.draft_version_id) {
    const { data } = await client.from("event_versions").select("id, event_id, parent_version_id, source, summary, prompt, config, document, created_at").eq("id", event.draft_version_id).maybeSingle();
    revision = data ? revisionFromRow(data as Record<string, unknown>) : null;
  }
  revision ??= await seedInitialRevision(event, ownerId);
  await reapStaleGenerationJobs({ eventId });

  const [versionsResult, messagesResult, runResult] = await Promise.all([
    client.from("event_versions").select("id, event_id, parent_version_id, source, summary, prompt, config, document, created_at").eq("event_id", eventId).not("document", "is", null).order("created_at", { ascending: false }).limit(50),
    client.from("builder_messages").select("id, event_id, run_id, role, content, selected_node_ids, version_id, status, created_at").eq("event_id", eventId).order("created_at", { ascending: true }).limit(200),
    client.from("generation_jobs").select("id, event_id, status, kind, base_version_id, result_version_id, cancel_requested, progress_message, error").eq("event_id", eventId).eq("status", "running").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const versions = (versionsResult.data ?? []).map((row) => revisionFromRow(row as Record<string, unknown>)).filter((row): row is SiteRevision => Boolean(row));
  return {
    event: { ...event, document: revision.document, draft_version_id: revision.id },
    revision,
    versions: versions.length ? versions : [revision],
    messages: (messagesResult.data ?? []) as BuilderMessage[],
    activeRun: (runResult.data as StudioRun | null) ?? null,
    persistence: "database",
  };
}

export async function commitStudioRevision(input: {
  eventId: string;
  ownerId: string | null;
  baseVersionId: string;
  document: SiteDocument;
  config: EventConfig;
  source: SiteRevision["source"];
  summary: string;
  prompt: string;
}) {
  const client = serviceSupabase();
  const document = siteDocumentSchema.parse(input.document);
  assertEventAssetOwnership(document, input.eventId);
  if (!client) {
    const revision: SiteRevision = { id: `demo-version-${crypto.randomUUID()}`, event_id: input.eventId, parent_version_id: input.baseVersionId, source: input.source, summary: input.summary, prompt: input.prompt, config: input.config, document, created_at: new Date().toISOString() };
    saveLocalDemoRevision(revision);
    const local = getLocalDemoEventById(input.eventId);
    if (local) saveLocalDemoEvent({ ...local, config: input.config, document });
    return { ok: true as const, revision };
  }

  const { data: inserted, error } = await client.from("event_versions").insert({
    event_id: input.eventId,
    parent_version_id: input.baseVersionId,
    source: input.source,
    summary: input.summary,
    prompt: input.prompt,
    config: input.config,
    document,
    created_by: input.ownerId,
  }).select("id, event_id, parent_version_id, source, summary, prompt, config, document, created_at").single();
  if (error || !inserted) return { ok: false as const, error: error?.message ?? "version_insert_failed" };

  const { data: updated } = await client.from("events").update({ draft_version_id: inserted.id, config: input.config, updated_at: new Date().toISOString() }).eq("id", input.eventId).eq("draft_version_id", input.baseVersionId).select("id").maybeSingle();
  if (!updated) {
    await client.from("event_versions").delete().eq("id", inserted.id);
    return { ok: false as const, error: "version_conflict" };
  }
  const revision = revisionFromRow(inserted as Record<string, unknown>);
  return revision ? { ok: true as const, revision } : { ok: false as const, error: "invalid_revision" };
}

export async function createBuilderMessage(input: {
  eventId: string;
  runId?: string | null;
  role: BuilderMessage["role"];
  content: string;
  selectedNodeIds?: string[];
  versionId?: string | null;
  status?: BuilderMessage["status"];
  ownerId?: string | null;
}) {
  const client = serviceSupabase();
  if (!client) return { id: `demo-message-${crypto.randomUUID()}`, event_id: input.eventId, run_id: input.runId ?? null, role: input.role, content: input.content, selected_node_ids: input.selectedNodeIds ?? [], version_id: input.versionId ?? null, status: input.status ?? "complete", created_at: new Date().toISOString() } satisfies BuilderMessage;
  const { data } = await client.from("builder_messages").insert({
    event_id: input.eventId,
    run_id: input.runId ?? null,
    role: input.role,
    content: input.content,
    selected_node_ids: input.selectedNodeIds ?? [],
    version_id: input.versionId ?? null,
    status: input.status ?? "complete",
    created_by: input.ownerId ?? null,
  }).select("id, event_id, run_id, role, content, selected_node_ids, version_id, status, created_at").single();
  return (data as BuilderMessage | null) ?? null;
}

export async function createStudioRun(input: { eventId: string; ownerId: string; baseVersionId: string | null; prompt: string; selectedNodeIds: string[]; kind?: StudioRun["kind"] }) {
  const client = serviceSupabase();
  if (!client) return `demo-run-${crypto.randomUUID()}`;
  const { data, error } = await client.from("generation_jobs").insert({
    event_id: input.eventId,
    owner_id: input.ownerId,
    slug: "studio",
    prompt: input.prompt,
    status: "running",
    kind: input.kind ?? "edit",
    base_version_id: input.baseVersionId,
    selected_node_ids: input.selectedNodeIds,
    progress_step: "planning",
    progress_percent: 10,
    progress_message: "Understanding your request…",
  }).select("id").single();
  if (error || !data) return null;
  return data.id as string;
}

export async function appendRunEvent(jobId: string, eventId: string, type: BuilderRunEvent["type"], payload: Record<string, unknown>) {
  const client = serviceSupabase();
  if (!client || jobId.startsWith("demo-run-")) return false;
  // The worker and the cancel route can append concurrently; on a (job_id, sequence) collision re-read and retry.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data } = await client.from("generation_job_events").select("sequence").eq("job_id", jobId).order("sequence", { ascending: false }).limit(1).maybeSingle();
    const { error } = await client.from("generation_job_events").insert({ job_id: jobId, event_id: eventId, sequence: Number(data?.sequence ?? 0) + 1, type, payload });
    if (!error) return true;
    if (error.code !== "23505") return false;
  }
  return false;
}

export async function loadRunEvents(jobId: string, afterSequence = 0) {
  const client = serviceSupabase();
  if (!client) return [];
  const { data } = await client.from("generation_job_events").select("sequence, type, payload, created_at").eq("job_id", jobId).gt("sequence", afterSequence).order("sequence").limit(200);
  return (data ?? []) as BuilderRunEvent[];
}

export async function getStudioRun(jobId: string) {
  const client = serviceSupabase();
  if (!client) return null;
  const { data } = await client.from("generation_jobs").select("id, event_id, status, kind, base_version_id, result_version_id, cancel_requested, progress_message, error").eq("id", jobId).maybeSingle();
  return (data as StudioRun | null) ?? null;
}

export async function updateStudioRun(jobId: string, values: Record<string, unknown>) {
  const client = serviceSupabase();
  if (!client || jobId.startsWith("demo-run-")) return;
  await client.from("generation_jobs").update(values).eq("id", jobId);
}

export async function requestStudioRunCancellation(jobId: string) {
  const client = serviceSupabase();
  if (!client) return true;
  const { data } = await client.from("generation_jobs").update({ cancel_requested: true, progress_message: "Stopping after the current step…" }).eq("id", jobId).eq("status", "running").select("id").maybeSingle();
  return Boolean(data);
}

// Workers are killed at maxDuration (300s), so a job still "running" after STALE_JOB_MS will never finish.
// Fail it, tell any listening studio, and refund its build credit (refunds are idempotent per job).
export async function reapStaleGenerationJobs(scope: { eventId?: string | null; ownerId?: string | null } = {}) {
  const client = serviceSupabase();
  if (!client) return 0;
  try {
    let query = client.from("generation_jobs")
      .update({ status: "failed", error: "job_timed_out", progress_step: "error", progress_message: "This run took too long and was stopped.", completed_at: new Date().toISOString() })
      .eq("status", "running")
      .lt("created_at", new Date(Date.now() - STALE_JOB_MS).toISOString());
    if (scope.eventId) query = query.eq("event_id", scope.eventId);
    if (scope.ownerId) query = query.eq("owner_id", scope.ownerId);
    const { data, error } = await query.select("id, event_id, owner_id");
    if (error || !data) return 0;
    for (const job of data as Array<{ id: string; event_id: string | null; owner_id: string | null }>) {
      if (!job.event_id) continue;
      await appendRunEvent(job.id, job.event_id, "error", { message: "job_timed_out" });
      if (job.owner_id) await refundBuildCredit(job.owner_id, job.event_id, job.id);
    }
    return data.length;
  } catch {
    return 0;
  }
}
