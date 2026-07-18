import { serviceSupabase } from "@/lib/supabase/server";

export const LAUNCH_PRICE_CENTS = 2_000;
export const AI_TRIAL_CREDIT_CENTS = 500;
export const AI_LAUNCH_BONUS_CENTS = 500;
// This is an internal, fixed credit cost per complete build. It gives us a
// deterministic hard cap even when provider usage reports arrive late.
export const AI_BUILD_CREDIT_CENTS = 50;

export async function isEventOwner(eventId: string, userId: string) {
  const client = serviceSupabase();
  if (!client) return false;
  const { data } = await client.from("events").select("owner_id").eq("id", eventId).maybeSingle();
  return data?.owner_id === userId;
}

export async function reserveBuildCredit(userId: string, eventId?: string | null) {
  const client = serviceSupabase();
  if (!client) return { ok: true as const, remainingCents: AI_TRIAL_CREDIT_CENTS };

  const { data, error } = await client.rpc("reserve_ai_build_credit", {
    p_user_id: userId,
    p_event_id: eventId ?? null,
    p_amount_cents: AI_BUILD_CREDIT_CENTS,
  });
  if (error || data === null) return { ok: false as const, error: "ai_credit_limit_reached" };
  return { ok: true as const, remainingCents: data as number };
}

export async function refundBuildCredit(userId: string, eventId: string, jobId: string) {
  const client = serviceSupabase();
  if (!client || jobId.startsWith("demo-run-")) return true;
  const { data, error } = await client.rpc("refund_ai_build_credit", {
    p_user_id: userId,
    p_event_id: eventId,
    p_job_id: jobId,
    p_amount_cents: AI_BUILD_CREDIT_CENTS,
  });
  return !error && Boolean(data);
}
