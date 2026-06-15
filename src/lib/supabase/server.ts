import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "@/lib/env";

export function serviceSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createSupabaseServerClient() {
  const url = env.supabaseUrl();
  const anon = env.supabaseAnonKey();
  if (!url || !anon) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — middleware handles refresh.
        }
      },
    },
  });
}

export async function getServerUser() {
  const client = await createSupabaseServerClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getAuthenticatedUser(authorizationHeader: string | null) {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "");
  const url = env.supabaseUrl();
  const anon = env.supabaseAnonKey();
  if (!token || !url || !anon) {
    return null;
  }

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}
