import { LandingPage } from "@/components/landing-page";
import { publicSignupEnabled } from "@/lib/env";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { authCallbackRecoveryPath } from "@/lib/auth/redirect";

export default async function Home({ searchParams }: { searchParams: Promise<{ template?: string; ref?: string; code?: string; next?: string }> }) {
  const { template, ref, code, next } = await searchParams;
  const recoveryPath = authCallbackRecoveryPath({ code, next });
  if (recoveryPath) redirect(recoveryPath);
  const user = await getServerUser();
  return (
    <LandingPage
      initialTemplate={template}
      authenticated={Boolean(user)}
      signupEnabled={publicSignupEnabled()}
      referralJourney={ref?.slice(0, 4_096)}
    />
  );
}
