import { LandingPage } from "@/components/landing-page";
import { publicSignupEnabled } from "@/lib/env";
import { getServerUser } from "@/lib/supabase/server";

export default async function Home({ searchParams }: { searchParams: Promise<{ template?: string; ref?: string }> }) {
  const [{ template, ref }, user] = await Promise.all([searchParams, getServerUser()]);
  return (
    <LandingPage
      initialTemplate={template}
      authenticated={Boolean(user)}
      signupEnabled={publicSignupEnabled()}
      referralJourney={ref?.slice(0, 4_096)}
    />
  );
}
