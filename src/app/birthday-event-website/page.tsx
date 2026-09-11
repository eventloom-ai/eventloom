import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { landingPageMetadata, seoLandingPages } from "@/lib/seo-landing-pages";

const page = seoLandingPages["birthday-event-website"];
export const metadata: Metadata = landingPageMetadata(page);

export default function BirthdayEventWebsitePage() {
  return <SeoLandingPage page={page} />;
}
