import "server-only";

import { LEGAL_VERSION } from "@/lib/legal-documents";
import { serviceSupabase } from "@/lib/supabase/server";

export async function hasCreatorLegalOnboarding(userId: string) {
  const client = serviceSupabase();
  if (!client) return false;
  const { data } = await client.from("profiles").select("age_18_confirmed_at, legal_version").eq("id", userId).maybeSingle();
  return Boolean(data?.age_18_confirmed_at && data.legal_version === LEGAL_VERSION);
}
