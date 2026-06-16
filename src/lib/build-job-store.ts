export type StoredBuildJob = {
  jobId: string;
  eventId?: string | null;
  slug: string;
  startedAt: string;
};

const STORAGE_KEY = "eventloom:active-build";

export function readStoredBuildJob(): StoredBuildJob | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBuildJob;
    if (!parsed?.jobId || !parsed?.slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredBuildJob(job: StoredBuildJob) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
}

export function clearStoredBuildJob() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
