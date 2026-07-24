import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { reportOperationalEvent } from "@/lib/monitoring";
import { safeTokenEquals } from "@/lib/security/request";
import { serviceSupabase } from "@/lib/supabase/server";
import { stripeClient } from "@/lib/payments/stripe";
import { processVerifiedStripeEvent } from "@/app/api/stripe/webhook/route";
import { DAILY_MAINTENANCE_JOB } from "@/lib/maintenance-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorized(request: NextRequest) {
  const expected = env.cronSecret();
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(expected && actual && safeTokenEquals(actual, expected));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const now = new Date().toISOString();
  const heartbeatStart = await client.from("maintenance_status").upsert({
    job_key: DAILY_MAINTENANCE_JOB,
    last_started_at: now,
    updated_at: now,
  }, { onConflict: "job_key" });
  if (heartbeatStart.error) {
    reportOperationalEvent("error", "maintenance_heartbeat_failed", { code: heartbeatStart.error.code });
    return NextResponse.json({ error: "maintenance_failed" }, { status: 500 });
  }

  const markFailed = async (code: string) => {
    const failedAt = new Date().toISOString();
    const result = await client.from("maintenance_status").update({
      last_failed_at: failedAt,
      last_error_code: code,
      updated_at: failedAt,
    }).eq("job_key", DAILY_MAINTENANCE_JOB);
    if (result.error) reportOperationalEvent("error", "maintenance_heartbeat_failed", { code: result.error.code });
  };
  const feedbackHashCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const feedbackSlaCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [purgeResult, registrantResult, feedbackHashResult, retryResult, overduePrivacyResult, staleFeedbackResult, retryEventsResult] = await Promise.all([
    client.rpc("purge_expired_rsvp_data"),
    client.from("domain_registrant_payloads").delete({ count: "exact" }).lt("expires_at", now),
    client.from("product_feedback").update({ ip_hash: null }, { count: "exact" }).lt("created_at", feedbackHashCutoff).not("ip_hash", "is", null),
    client.from("fulfillment_jobs").select("id", { count: "exact", head: true }).in("state", ["received", "verified", "domain_pending", "retry"]).lte("next_attempt_at", now),
    client.from("privacy_requests").select("id", { count: "exact", head: true }).not("status", "in", '("completed","denied")').lte("due_at", now),
    client.from("product_feedback").select("id", { count: "exact", head: true }).in("status", ["new", "reviewing", "planned"]).lte("created_at", feedbackSlaCutoff),
    client.from("provider_webhook_events").select("id, provider_event_id, attempt_count").eq("provider", "stripe").eq("status", "retry").order("received_at").limit(5),
  ]);

  if (purgeResult.error || registrantResult.error || feedbackHashResult.error || retryResult.error || overduePrivacyResult.error || staleFeedbackResult.error || retryEventsResult.error) {
    reportOperationalEvent("error", "maintenance_failed", {
      purgeError: purgeResult.error?.code,
      registrantError: registrantResult.error?.code,
      feedbackHashError: feedbackHashResult.error?.code,
      retryError: retryResult.error?.code,
      privacyError: overduePrivacyResult.error?.code,
      feedbackQueueError: staleFeedbackResult.error?.code,
      providerRetryError: retryEventsResult.error?.code,
    });
    await markFailed("maintenance_query_failed");
    return NextResponse.json({ error: "maintenance_failed" }, { status: 500 });
  }

  const retryJobs = retryResult.count ?? 0;
  const overduePrivacyRequests = overduePrivacyResult.count ?? 0;
  const staleFeedback = staleFeedbackResult.count ?? 0;
  let replayedEvents = 0;
  const stripe = stripeClient();
  let replayFailed = false;
  for (const row of retryEventsResult.data ?? []) {
    if (Number(row.attempt_count ?? 0) >= 10) {
      const retryLimitResult = await client.from("provider_webhook_events").update({ status: "failed", last_error_code: "retry_limit_reached" }).eq("id", row.id);
      if (retryLimitResult.error) replayFailed = true;
      continue;
    }
    if (!stripe) {
      replayFailed = true;
      break;
    }
    try {
      const event = await stripe.events.retrieve(row.provider_event_id);
      const response = await processVerifiedStripeEvent(event, "maintenance-replay");
      if (response.ok) replayedEvents += 1;
      else replayFailed = true;
    } catch {
      replayFailed = true;
      reportOperationalEvent("error", "fulfillment_replay_failed", { providerEventId: row.provider_event_id, attemptCount: row.attempt_count });
    }
  }
  if (replayFailed) {
    await markFailed("fulfillment_replay_failed");
    return NextResponse.json({ error: "maintenance_failed" }, { status: 500 });
  }

  const succeededAt = new Date().toISOString();
  const heartbeatSuccess = await client.from("maintenance_status").update({
    last_succeeded_at: succeededAt,
    last_error_code: null,
    updated_at: succeededAt,
  }).eq("job_key", DAILY_MAINTENANCE_JOB);
  if (heartbeatSuccess.error) {
    reportOperationalEvent("error", "maintenance_heartbeat_failed", { code: heartbeatSuccess.error.code });
    await markFailed("heartbeat_update_failed");
    return NextResponse.json({ error: "maintenance_failed" }, { status: 500 });
  }
  reportOperationalEvent(retryJobs || overduePrivacyRequests || staleFeedback ? "warn" : "info", "maintenance_completed", {
    purgedRsvpSubmissions: Number(purgeResult.data ?? 0),
    expiredRegistrantPayloads: registrantResult.count ?? 0,
    purgedFeedbackIpHashes: feedbackHashResult.count ?? 0,
    retryJobs,
    overduePrivacyRequests,
    staleFeedback,
    replayedEvents,
  });

  return NextResponse.json({
    ok: true,
    purged_rsvp_submissions: Number(purgeResult.data ?? 0),
    expired_registrant_payloads: registrantResult.count ?? 0,
    purged_feedback_ip_hashes: feedbackHashResult.count ?? 0,
    fulfillment_jobs_needing_attention: retryJobs,
    overdue_privacy_requests: overduePrivacyRequests,
    feedback_items_past_sla: staleFeedback,
    replayed_provider_events: replayedEvents,
  });
}
