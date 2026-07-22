import "server-only";

import { serviceSupabase } from "@/lib/supabase/server";

export async function beginProviderEvent(providerEventId: string, eventType: string) {
  const client = serviceSupabase();
  if (!client) return { ok: false as const, error: "storage_not_configured" };
  const { data: existing } = await client.from("provider_webhook_events").select("id, status, attempt_count").eq("provider", "stripe").eq("provider_event_id", providerEventId).maybeSingle();
  if (existing?.status === "processed") return { ok: true as const, duplicate: true, client, eventRowId: existing.id };
  if (existing) {
    const { error } = await client.from("provider_webhook_events").update({ status: "verified", attempt_count: Number(existing.attempt_count ?? 0) + 1, last_error_code: null }).eq("id", existing.id);
    if (error) return { ok: false as const, error: "webhook_store_failed" };
    return { ok: true as const, duplicate: false, client, eventRowId: existing.id };
  }
  const { data, error } = await client.from("provider_webhook_events").insert({ provider: "stripe", provider_event_id: providerEventId, event_type: eventType, status: "verified", attempt_count: 1 }).select("id").single();
  if (error || !data) return { ok: false as const, error: "webhook_store_failed" };
  return { ok: true as const, duplicate: false, client, eventRowId: data.id };
}

export async function startFulfillmentJob(eventId: string, orderId: string) {
  const client = serviceSupabase();
  if (!client) return null;
  const { data, error } = await client.from("fulfillment_jobs").upsert({ event_id: eventId, order_id: orderId, state: "verified", next_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "order_id" }).select("id").single();
  if (error || !data) return null;
  await client.from("fulfillment_attempts").insert({ job_id: data.id, state: "verified", outcome: "started" });
  return data.id as string;
}

export async function markFulfillment(input: { eventRowId: string; jobId?: string | null; state: "service_active" | "domain_active" | "retry" | "failed"; errorCode?: string }) {
  const client = serviceSupabase();
  if (!client) return false;
  const complete = input.state === "service_active" || input.state === "domain_active";
  const [{ error: eventError }, jobResult] = await Promise.all([
    client.from("provider_webhook_events").update({ status: complete ? "processed" : input.state, last_error_code: input.errorCode ?? null, processed_at: complete ? new Date().toISOString() : null }).eq("id", input.eventRowId),
    input.jobId ? client.from("fulfillment_jobs").update({ state: input.state, last_error_code: input.errorCode ?? null, completed_at: complete ? new Date().toISOString() : null, next_attempt_at: complete ? new Date().toISOString() : new Date(Date.now() + 5 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", input.jobId) : Promise.resolve({ error: null }),
  ]);
  if (input.jobId) await client.from("fulfillment_attempts").insert({ job_id: input.jobId, state: input.state, outcome: complete ? "succeeded" : input.state, error_code: input.errorCode ?? null });
  return !eventError && !jobResult.error;
}
