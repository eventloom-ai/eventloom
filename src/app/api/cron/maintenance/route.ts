import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { reportOperationalEvent } from "@/lib/monitoring";
import { safeTokenEquals } from "@/lib/security/request";
import { serviceSupabase } from "@/lib/supabase/server";
import { stripeClient } from "@/lib/payments/stripe";
import { processVerifiedStripeEvent } from "@/app/api/stripe/webhook/route";

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
  const [purgeResult, registrantResult, retryResult, overduePrivacyResult, retryEventsResult] = await Promise.all([
    client.rpc("purge_expired_rsvp_data"),
    client.from("domain_registrant_payloads").delete({ count: "exact" }).lt("expires_at", now),
    client.from("fulfillment_jobs").select("id", { count: "exact", head: true }).in("state", ["received", "verified", "domain_pending", "retry"]).lte("next_attempt_at", now),
    client.from("privacy_requests").select("id", { count: "exact", head: true }).not("status", "in", '("completed","denied")').lte("due_at", now),
    client.from("provider_webhook_events").select("id, provider_event_id, attempt_count").eq("provider", "stripe").eq("status", "retry").order("received_at").limit(5),
  ]);

  if (purgeResult.error || registrantResult.error || retryResult.error || overduePrivacyResult.error || retryEventsResult.error) {
    reportOperationalEvent("error", "maintenance_failed", {
      purgeError: purgeResult.error?.code,
      registrantError: registrantResult.error?.code,
      retryError: retryResult.error?.code,
      privacyError: overduePrivacyResult.error?.code,
      providerRetryError: retryEventsResult.error?.code,
    });
    return NextResponse.json({ error: "maintenance_failed" }, { status: 500 });
  }

  const retryJobs = retryResult.count ?? 0;
  const overduePrivacyRequests = overduePrivacyResult.count ?? 0;
  let replayedEvents = 0;
  const stripe = stripeClient();
  for (const row of retryEventsResult.data ?? []) {
    if (Number(row.attempt_count ?? 0) >= 10) {
      await client.from("provider_webhook_events").update({ status: "failed", last_error_code: "retry_limit_reached" }).eq("id", row.id);
      continue;
    }
    if (!stripe) break;
    try {
      const event = await stripe.events.retrieve(row.provider_event_id);
      const response = await processVerifiedStripeEvent(event, "maintenance-replay");
      if (response.ok) replayedEvents += 1;
    } catch {
      reportOperationalEvent("error", "fulfillment_replay_failed", { providerEventId: row.provider_event_id, attemptCount: row.attempt_count });
    }
  }
  reportOperationalEvent(retryJobs || overduePrivacyRequests ? "warn" : "info", "maintenance_completed", {
    purgedRsvpSubmissions: Number(purgeResult.data ?? 0),
    expiredRegistrantPayloads: registrantResult.count ?? 0,
    retryJobs,
    overduePrivacyRequests,
    replayedEvents,
  });

  return NextResponse.json({
    ok: true,
    purged_rsvp_submissions: Number(purgeResult.data ?? 0),
    expired_registrant_payloads: registrantResult.count ?? 0,
    fulfillment_jobs_needing_attention: retryJobs,
    overdue_privacy_requests: overduePrivacyRequests,
    replayed_provider_events: replayedEvents,
  });
}
