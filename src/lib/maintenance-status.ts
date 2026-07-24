export const DAILY_MAINTENANCE_JOB = "daily";
export const MAINTENANCE_MAX_AGE_MS = 36 * 60 * 60 * 1000;
export const MAINTENANCE_MAX_RUN_MS = 30 * 60 * 1000;

export type MaintenanceStatus = {
  last_started_at: string;
  last_succeeded_at: string | null;
  last_failed_at: string | null;
};

function timestamp(value: string | null) {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

export function isMaintenanceHealthy(
  status: MaintenanceStatus | null | undefined,
  nowMs = Date.now(),
) {
  if (!status) return false;
  const startedAt = timestamp(status.last_started_at);
  const succeededAt = timestamp(status.last_succeeded_at);
  const failedAt = timestamp(status.last_failed_at);
  if (!Number.isFinite(startedAt) || !Number.isFinite(succeededAt)) return false;
  if (nowMs - succeededAt > MAINTENANCE_MAX_AGE_MS || succeededAt > nowMs) return false;
  if (Number.isFinite(failedAt) && failedAt > succeededAt) return false;
  if (startedAt > succeededAt && nowMs - startedAt > MAINTENANCE_MAX_RUN_MS) return false;
  return true;
}
