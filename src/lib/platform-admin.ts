import "server-only";

import { createSupabaseServerClient, serviceSupabase } from "@/lib/supabase/server";

// The creator account is also seeded in the platform_admins migration. Keep a
// narrow fallback for deployments that have not been given the server-only
// Supabase key yet; no other account can use this path.
const CREATOR_USER_ID = "aef4bcd8-f4ed-4327-9359-af12108f742c";

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

  return userId === CREATOR_USER_ID;
}
