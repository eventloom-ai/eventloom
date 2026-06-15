import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/supabase/public-env";

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabasePublicEnv()) {
    return { response, user: null };
  }

  const supabase = createServerClient(supabasePublicEnv.url, supabasePublicEnv.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
