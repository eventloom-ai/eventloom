import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonPage } from "@/components/comparison-page";
import { competitorMetadata, competitors, getCompetitor } from "@/lib/comparisons";

// Every comparison is prerendered at build time; any other slug is a 404 rather than an on-demand render.
export const dynamicParams = false;

export function generateStaticParams() {
  return competitors.map((competitor) => ({ competitor: competitor.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ competitor: string }> }): Promise<Metadata> {
  const competitor = getCompetitor((await params).competitor);
  return competitor ? competitorMetadata(competitor) : {};
}

export default async function CompetitorComparisonRoute({ params }: { params: Promise<{ competitor: string }> }) {
  const competitor = getCompetitor((await params).competitor);
  if (!competitor) notFound();
  return <ComparisonPage competitor={competitor} />;
}
