import { createBrowserClient } from "@supabase/ssr";
import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/supabase/public-env";

export function createSupabaseBrowserClient() {
  if (!hasSupabasePublicEnv()) {
    return null;
  }

  return createBrowserClient(supabasePublicEnv.url, supabasePublicEnv.key);
}
