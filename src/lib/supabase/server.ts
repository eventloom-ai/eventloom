import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";

export function serviceSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false },
  });
}

export function anonSupabase() {
  const url = env.supabaseUrl();
  const anon = env.supabaseAnonKey();
  if (!url || !anon) {
    return null;
  }

  return createClient(url, anon, {
    auth: { persistSession: false },
  });
}

export async function getAuthenticatedUser(authorizationHeader: string | null) {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "");
  const client = anonSupabase();
  if (!token || !client) {
    return null;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}
