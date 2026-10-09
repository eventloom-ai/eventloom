import "server-only";

import type { serviceSupabase } from "@/lib/supabase/server";

type ServiceClient = NonNullable<ReturnType<typeof serviceSupabase>>;

export const OPEN_REPORT_STATUSES = ["new", "reviewing"] as const;

export type AbuseReportRow = {
  id: string;
  event_id: string | null;
  slug: string;
  reason: string;
  details: string;
  reporter_email: string | null;
  status: "new" | "reviewing" | "actioned" | "dismissed";
  created_at: string;
};

export type SuspendedEventRow = { id: string; slug: string; suspended_at: string; suspension_reason: string | null };

export async function countOpenReports(client: ServiceClient) {
  const { count, error } = await client.from("abuse_reports").select("id", { count: "exact", head: true }).in("status", [...OPEN_REPORT_STATUSES]);
  return error ? null : count ?? 0;
}

export async function listOpenReports(client: ServiceClient, limit = 50): Promise<AbuseReportRow[]> {
  const { data } = await client
    .from("abuse_reports")
    .select("id, event_id, slug, reason, details, reporter_email, status, created_at")
    .in("status", [...OPEN_REPORT_STATUSES])
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AbuseReportRow[];
}

export async function listSuspendedEvents(client: ServiceClient, limit = 50): Promise<SuspendedEventRow[]> {
  const { data } = await client
    .from("events")
    .select("id, slug, suspended_at, suspension_reason")
    .not("suspended_at", "is", null)
    .order("suspended_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as SuspendedEventRow[];
}

/** Takes an event down on every host and closes every open report about it. Idempotent. */
export async function suspendEvent(client: ServiceClient, input: { eventId: string; reason: string; adminId: string }) {
  const now = new Date().toISOString();
  const { data: event, error } = await client
    .from("events")
    .update({ suspended_at: now, suspension_reason: input.reason, updated_at: now })
    .eq("id", input.eventId)
    .select("id, slug")
    .maybeSingle();
  if (error || !event) return { ok: false as const, error: error ? "suspend_failed" : "not_found" };
  await client
    .from("abuse_reports")
    .update({ status: "actioned", resolved_at: now, resolved_by: input.adminId })
    .eq("event_id", input.eventId)
    .in("status", [...OPEN_REPORT_STATUSES]);
  return { ok: true as const, slug: event.slug as string };
}

/** Restores a suspended event exactly as it was (its status, published version and RSVP setting never changed). */
export async function liftSuspension(client: ServiceClient, input: { eventId: string }) {
  const { data: event, error } = await client
    .from("events")
    .update({ suspended_at: null, suspension_reason: null, updated_at: new Date().toISOString() })
    .eq("id", input.eventId)
    .select("id, slug")
    .maybeSingle();
  if (error || !event) return { ok: false as const, error: error ? "unsuspend_failed" : "not_found" };
  return { ok: true as const, slug: event.slug as string };
}

export async function resolveReport(client: ServiceClient, input: { reportId: string; status: "reviewing" | "dismissed"; adminId: string }) {
  const resolved = input.status === "dismissed";
  const { data, error } = await client
    .from("abuse_reports")
    .update({ status: input.status, resolved_at: resolved ? new Date().toISOString() : null, resolved_by: resolved ? input.adminId : null })
    .eq("id", input.reportId)
    .select("id, event_id")
    .maybeSingle();
  if (error || !data) return { ok: false as const, error: error ? "update_failed" : "not_found" };
  return { ok: true as const, eventId: (data.event_id as string | null) ?? null };
}
