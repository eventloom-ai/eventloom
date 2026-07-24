import { describe, expect, it } from "vitest";
import {
  isMaintenanceHealthy,
  MAINTENANCE_MAX_AGE_MS,
  MAINTENANCE_MAX_RUN_MS,
} from "@/lib/maintenance-status";

const now = Date.parse("2026-07-24T12:00:00.000Z");
const iso = (milliseconds: number) => new Date(milliseconds).toISOString();

describe("maintenance heartbeat health", () => {
  it("accepts a recent successful run", () => {
    expect(isMaintenanceHealthy({
      last_started_at: iso(now - 60_000),
      last_succeeded_at: iso(now - 30_000),
      last_failed_at: null,
    }, now)).toBe(true);
  });

  it("rejects missing, stale, failed, future, and stuck runs", () => {
    expect(isMaintenanceHealthy(null, now)).toBe(false);
    expect(isMaintenanceHealthy({
      last_started_at: iso(now - MAINTENANCE_MAX_AGE_MS - 2_000),
      last_succeeded_at: iso(now - MAINTENANCE_MAX_AGE_MS - 1_000),
      last_failed_at: null,
    }, now)).toBe(false);
    expect(isMaintenanceHealthy({
      last_started_at: iso(now - 60_000),
      last_succeeded_at: iso(now - 50_000),
      last_failed_at: iso(now - 40_000),
    }, now)).toBe(false);
    expect(isMaintenanceHealthy({
      last_started_at: iso(now + 1_000),
      last_succeeded_at: iso(now + 2_000),
      last_failed_at: null,
    }, now)).toBe(false);
    expect(isMaintenanceHealthy({
      last_started_at: iso(now - MAINTENANCE_MAX_RUN_MS - 1_000),
      last_succeeded_at: iso(now - MAINTENANCE_MAX_RUN_MS - 2_000),
      last_failed_at: null,
    }, now)).toBe(false);
  });
});
