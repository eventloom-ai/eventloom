import "server-only";

import { LEGAL_VERSION } from "@/lib/legal-version";
import { serviceSupabase } from "@/lib/supabase/server";

export type CreatorLegalStatus = { current: boolean; acceptedVersion: string | null };

/** Whether the creator has confirmed 18+ and accepted the current LEGAL_VERSION. Bumping the version asks everyone again. */
export async function creatorLegalStatus(userId: string): Promise<CreatorLegalStatus | null> {
  const client = serviceSupabase();
  if (!client) return null;
  const { data } = await client.from("profiles").select("age_18_confirmed_at, legal_version").eq("id", userId).maybeSingle();
  const acceptedVersion = typeof data?.legal_version === "string" ? data.legal_version : null;
  return { current: Boolean(data?.age_18_confirmed_at && acceptedVersion === LEGAL_VERSION), acceptedVersion };
}

export async function hasCreatorLegalOnboarding(userId: string) {
  return (await creatorLegalStatus(userId))?.current === true;
}
