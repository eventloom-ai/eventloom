import "server-only";

import { serviceSupabase } from "@/lib/supabase/server";

export async function hasCompleteEventPrivacyNotice(eventId: string) {
  const client = serviceSupabase();
  if (!client) return false;
  const { data } = await client.from("event_settings").select("controller_legal_name, privacy_contact, collection_purpose, optional_field_justification, collect_email, collect_phone").eq("event_id", eventId).maybeSingle();
  if (!data) return false;
  const required = [data.controller_legal_name, data.privacy_contact, data.collection_purpose];
  if (required.some((value) => typeof value !== "string" || !value.trim())) return false;
  if ((data.collect_email || data.collect_phone) && (typeof data.optional_field_justification !== "string" || !data.optional_field_justification.trim())) return false;
  return true;
}
