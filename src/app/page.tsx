import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { frequentlyAsked, LandingPage } from "@/components/landing-page";
import { appUrl, publicSignupEnabled } from "@/lib/env";
import { absoluteUrl, faqPageJsonLd, softwareApplicationJsonLd } from "@/lib/structured-data";
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
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Eventloom event websites with online RSVPs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Event Website Builder with RSVPs | Eventloom",
    description: "Create a beautiful event website, collect online RSVPs, and manage every guest response in one simple place.",
    images: ["/opengraph-image"],
  },
};

export default async function Home() {
  const user = await getServerUser();
  const siteUrl = appUrl();
  return (
    <>
      <JsonLd data={[softwareApplicationJsonLd(siteUrl), faqPageJsonLd(frequentlyAsked, absoluteUrl(siteUrl))]} />
      <LandingPage
        authenticated={Boolean(user)}
        authConfigured={hasSupabasePublicEnv()}
        signupEnabled={publicSignupEnabled()}
      />
    </>
  );
}
