import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { landingPageMetadata, seoLandingPages } from "@/lib/seo-landing-pages";

const page = seoLandingPages["rsvp-website"];
export const metadata: Metadata = landingPageMetadata(page);

export default function RsvpWebsitePage() {
  return <SeoLandingPage page={page} />;
}
