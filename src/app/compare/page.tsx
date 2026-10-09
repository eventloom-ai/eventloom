import type { Metadata } from "next";
import { CompareHubPage } from "@/components/compare-hub-page";
import { compareHubMetadata } from "@/lib/comparisons";

export const metadata: Metadata = compareHubMetadata();

export default function ComparePage() {
  return <CompareHubPage />;
}
