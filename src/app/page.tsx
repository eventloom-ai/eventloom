import { LandingPage } from "@/components/landing-page";
import { publicSignupEnabled } from "@/lib/env";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { getServerUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getServerUser();
  return (
    <LandingPage
      authenticated={Boolean(user)}
      authConfigured={hasSupabasePublicEnv()}
      signupEnabled={publicSignupEnabled()}
    />
  );
}
