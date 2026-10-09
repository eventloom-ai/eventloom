import type { Metadata } from "next";
import { RsvpBuildersGuidePage } from "@/components/rsvp-builders-guide-page";
import { guideMetadata } from "@/lib/comparisons";

export const metadata: Metadata = guideMetadata();

export default function BestRsvpWebsiteBuildersPage() {
  return <RsvpBuildersGuidePage />;
}
