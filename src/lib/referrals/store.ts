import "server-only";

import { serviceSupabase } from "@/lib/supabase/server";
import { verifyReferralJourneyReference } from "@/lib/referrals/token";

export const REFERRAL_COOKIE = "eventloom_referral";
export const REFERRAL_PREFERENCE_COOKIE = "eventloom_referral_preference";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const REFERRAL_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 180;

export type ReferralPreference = "accepted" | "declined" | "unset";

type ReferralJourneyRow = {
  id: string;
  clicked_at: string;
  expires_at: string;
  consent_status: "pending" | "accepted" | "declined";
  referred_user_id: string | null;
  referred_event_id: string | null;
  withdrawn_at: string | null;
};

function isActive(row: ReferralJourneyRow | null | undefined) {
  return Boolean(row && !row.withdrawn_at && new Date(row.expires_at) > new Date());
}

export async function createReferralJourney(sourceEventId: string) {
  const client = serviceSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from("referral_journeys")
    .insert({ source_event_id: sourceEventId })
    .select("id")
    .single();
  return error ? null : data?.id ?? null;
}

export async function activeReferralJourney(reference: string | null | undefined) {
  const verified = verifyReferralJourneyReference(reference);
  const client = serviceSupabase();
  if (!verified || !client) return null;
  const { data } = await client
    .from("referral_journeys")
    .select("id, clicked_at, expires_at, consent_status, referred_user_id, referred_event_id, withdrawn_at")
    .eq("id", verified.journeyId)
    .maybeSingle();
  const row = data as ReferralJourneyRow | null;
  return isActive(row) ? row : null;
}

export async function setReferralConsent(reference: string, preference: Exclude<ReferralPreference, "unset">) {
  const journey = await activeReferralJourney(reference);
  const client = serviceSupabase();
  if (!journey || !client) return null;
  const now = new Date().toISOString();
  const { error } = await client
    .from("referral_journeys")
    .update({
      consent_status: preference,
      consented_at: preference === "accepted" ? now : null,
      updated_at: now,
    })
    .eq("id", journey.id)
    .is("withdrawn_at", null);
  return error ? null : journey.id;
}

export async function withdrawReferral(reference: string | null | undefined) {
  const journey = await activeReferralJourney(reference);
  const client = serviceSupabase();
  if (!journey || !client) return false;
  const now = new Date().toISOString();
  const { error } = await client
    .from("referral_journeys")
    .update({ consent_status: "declined", withdrawn_at: now, updated_at: now })
    .eq("id", journey.id);
  return !error;
}

export async function claimReferralJourney(input: {
  reference: string | null | undefined;
  userId: string;
  userCreatedAt: string;
}) {
  const client = serviceSupabase();
  if (!client) return null;

  const { data: existing } = await client
    .from("referral_journeys")
    .select("id")
    .eq("referred_user_id", input.userId)
    .is("withdrawn_at", null)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const journey = await activeReferralJourney(input.reference);
  if (!journey || journey.referred_user_id) return null;
  const clickedAt = Date.parse(journey.clicked_at);
  const createdAt = Date.parse(input.userCreatedAt);
  const isNewAccount = Number.isFinite(createdAt) && Number.isFinite(clickedAt) && createdAt >= clickedAt - 60_000;
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("referral_journeys")
    .update({
      referred_user_id: input.userId,
      is_new_account: isNewAccount,
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", journey.id)
    .is("referred_user_id", null)
    .is("withdrawn_at", null)
    .select("id")
    .maybeSingle();
  if (!error && data?.id) return data.id as string;

  const { data: winner } = await client
    .from("referral_journeys")
    .select("id")
    .eq("referred_user_id", input.userId)
    .is("withdrawn_at", null)
    .maybeSingle();
  return winner?.id as string | undefined ?? null;
}

export async function attachReferralDraft(input: {
  userId: string;
  eventId: string;
}) {
  const client = serviceSupabase();
  if (!client) return false;
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("referral_journeys")
    .update({ referred_event_id: input.eventId, draft_created_at: now, updated_at: now })
    .eq("referred_user_id", input.userId)
    .is("referred_event_id", null)
    .is("withdrawn_at", null)
    .select("id")
    .maybeSingle();
  return !error && Boolean(data?.id);
}

export async function markReferralPaidPublication(eventId: string) {
  const client = serviceSupabase();
  if (!client) return false;
  const now = new Date().toISOString();
  const { error } = await client
    .from("referral_journeys")
    .update({ paid_published_at: now, updated_at: now })
    .eq("referred_event_id", eventId)
    .is("paid_published_at", null)
    .is("withdrawn_at", null);
  return !error;
}
