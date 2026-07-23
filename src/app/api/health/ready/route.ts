import { NextRequest, NextResponse } from "next/server";
import { env, externalLaunchReviewsApproved, isOpenSrsConfigured, isStripeConfigured, isSupabaseConfigured, isTurnstileConfigured, isVercelConfigured, legalIdentityConfigured, monitoringConfigured } from "@/lib/env";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { safeTokenEquals } from "@/lib/security/request";
import { serviceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function authorized(request: NextRequest) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (env.readinessToken() && supplied && safeTokenEquals(supplied, env.readinessToken())) return true;
  const auth = await getAuthContext();
  return Boolean(auth && hasRequiredMfa(auth) && await isPlatformAdmin(auth.user.id));
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const client = serviceSupabase();
  let database = false;
  let activeLegalDocuments = false;
  let fulfillmentQueueHealthy = false;
  let privacyQueueHealthy = false;
  if (client) {
    const now = new Date().toISOString();
    const [databaseResult, legalResult, fulfillmentResult, privacyResult] = await Promise.all([
      client.from("orders").select("id", { count: "exact", head: true }).limit(1),
      client.from("legal_documents").select("id", { count: "exact", head: true }).eq("status", "active").eq("version", "2026-07-22-beta").in("document_key", ["terms", "privacy", "domains"]),
      client.from("fulfillment_jobs").select("id", { count: "exact", head: true }).in("state", ["received", "verified", "domain_pending", "retry"]).lte("next_attempt_at", now),
      client.from("privacy_requests").select("id", { count: "exact", head: true }).not("status", "in", '("completed","denied")').lte("due_at", now),
    ]);
    database = !databaseResult.error;
    activeLegalDocuments = !legalResult.error && legalResult.count === 3;
    fulfillmentQueueHealthy = !fulfillmentResult.error && fulfillmentResult.count === 0;
    privacyQueueHealthy = !privacyResult.error && privacyResult.count === 0;
  }
  const checks = {
    database: isSupabaseConfigured() && database,
    stripe: isStripeConfigured() && Boolean(env.stripeWebhookSecret()),
    vercel: isVercelConfigured(),
    registrar: isOpenSrsConfigured(),
    turnstile: isTurnstileConfigured(),
    legalIdentity: legalIdentityConfigured(),
    activeLegalDocuments,
    externalReviews: externalLaunchReviewsApproved(),
    monitoring: monitoringConfigured(),
    fulfillmentQueue: fulfillmentQueueHealthy,
    privacyQueue: privacyQueueHealthy,
  };
  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json({ ready, checks, checkedAt: new Date().toISOString() }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
