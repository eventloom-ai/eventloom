import "server-only";

import { createSupabaseServerClient, serviceSupabase } from "@/lib/supabase/server";

/**
 * Platform administrators bypass billing and AI-credit gates for their own
 * work. They do not bypass event membership or other tenant access checks.
 */
export async function isPlatformAdmin(userId: string | null | undefined) {
  if (!userId) return false;

  const serviceClient = serviceSupabase();
  if (serviceClient) {
    const { data, error } = await serviceClient
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) return true;
  }

  const userClient = await createSupabaseServerClient();
  if (userClient) {
    const { data } = await userClient
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return true;
  }

  return false;
}
