import type { BuildJobStatus, BuildProgressStep } from "@/lib/agent/progress";
import type { EventConfig, EventRecord, SiteRevision } from "@/lib/types";

type LocalDemoState = {
  jobs: Map<string, BuildJobStatus>;
  events: Map<string, EventRecord>;
  revisions: Map<string, SiteRevision[]>;
  /** Processed (WebP) images uploaded in demo mode, served by /api/assets/<id> like stored assets. */
  assets: Map<string, Uint8Array>;
};

const MAX_DEMO_ASSETS = 64;

const globalDemoState = globalThis as typeof globalThis & {
  __eventloomLocalDemoState?: LocalDemoState;
};

function state(): LocalDemoState {
  globalDemoState.__eventloomLocalDemoState ??= {
    jobs: new Map(),
    events: new Map(),
    revisions: new Map(),
    assets: new Map(),
  };
  globalDemoState.__eventloomLocalDemoState.revisions ??= new Map();
  globalDemoState.__eventloomLocalDemoState.assets ??= new Map();
  return globalDemoState.__eventloomLocalDemoState;
}

export function saveLocalDemoAsset(id: string, data: Uint8Array) {
  const assets = state().assets;
  assets.set(id, data);
  // Demo assets live in memory only; keep the newest few.
  for (const key of assets.keys()) {
    if (assets.size <= MAX_DEMO_ASSETS) break;
    assets.delete(key);
  }
}

export function getLocalDemoAsset(id: string) {
  return state().assets.get(id) ?? null;
}

export function createLocalDemoJob(slug: string): BuildJobStatus {
  const job: BuildJobStatus = {
    id: `demo-job-${crypto.randomUUID()}`,
    status: "running",
    progressStep: "started",
    progressPercent: 3,
    progressMessage: "Starting your local demo build…",
    slug,
    eventId: null,
    error: null,
    resultConfig: null,
    template: null,
  };
  state().jobs.set(job.id, job);
  return job;
}

export function getLocalDemoJob(jobId: string) {
  return state().jobs.get(jobId) ?? null;
}

export function updateLocalDemoJob(
  jobId: string,
  input: {
    step: BuildProgressStep;
    message: string;
    progressPercent: number;
    eventId?: string | null;
    resultConfig?: EventConfig;
  },
) {
  const current = state().jobs.get(jobId);
  if (!current) return;
  state().jobs.set(jobId, {
    ...current,
    progressStep: input.step,
    progressPercent: input.progressPercent,
    progressMessage: input.message,
    eventId: input.eventId ?? current.eventId,
    resultConfig: input.resultConfig ?? current.resultConfig,
    template: input.resultConfig?.template ?? current.template,
  });
}

export function finishLocalDemoJob(jobId: string, status: "succeeded" | "failed", error?: string) {
  const current = state().jobs.get(jobId);
  if (!current) return;
  state().jobs.set(jobId, {
    ...current,
    status,
    error: error ?? null,
    ...(status === "succeeded"
      ? { progressStep: "done", progressPercent: 100, progressMessage: "Your local preview is ready." }
      : { progressStep: "error", progressMessage: error ?? "Build failed." }),
  });
}

export function saveLocalDemoEvent(event: EventRecord) {
  state().events.set(event.slug, event);
}

export function getLocalDemoEventBySlug(slug: string) {
  return state().events.get(slug) ?? null;
}

export function getLocalDemoEventById(eventId: string) {
  return [...state().events.values()].find((event) => event.id === eventId) ?? null;
}

export function saveLocalDemoRevision(revision: SiteRevision) {
  const current = state().revisions.get(revision.event_id) ?? [];
  state().revisions.set(revision.event_id, [revision, ...current.filter((item) => item.id !== revision.id)].slice(0, 50));
}

export function getLocalDemoRevisions(eventId: string) {
  return state().revisions.get(eventId) ?? [];
}
