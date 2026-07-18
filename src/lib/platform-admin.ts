import "server-only";

import { serviceSupabase } from "@/lib/supabase/server";

/**
 * Platform administrators bypass billing and AI-credit gates for their own
 * work. They do not bypass event membership or other tenant access checks.
 */
export async function isPlatformAdmin(userId: string | null | undefined) {
  if (!userId) return false;

  const client = serviceSupabase();
  if (!client) return false;

  const { data, error } = await client
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}
