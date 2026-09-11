import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { publicSignupEnabled } from "@/lib/env";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { getServerUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Event Website Builder with RSVPs | Eventloom",
  description: "Create a beautiful event website, collect online RSVPs, and manage every guest response in one simple place.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Event Website Builder with RSVPs | Eventloom",
    description: "Create a beautiful event website, collect online RSVPs, and manage every guest response in one simple place.",
    url: "/",
  },
};

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
