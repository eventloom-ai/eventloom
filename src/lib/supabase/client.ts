import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const url = env.supabaseUrl();
  const anon = env.supabaseAnonKey();
  if (!url || !anon) {
    return null;
  }

  return createBrowserClient(url, anon);
}
