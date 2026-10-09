import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OccasionTemplatePage } from "@/components/occasion-template-page";
import { getOccasionTemplate, occasionMetadata, occasionTemplates } from "@/lib/occasion-templates";

// Every occasion is prerendered at build time; anything else is a 404 rather than an on-demand render.
export const dynamicParams = false;

export function generateStaticParams() {
  return occasionTemplates.map((occasion) => ({ occasion: occasion.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ occasion: string }> }): Promise<Metadata> {
  const occasion = getOccasionTemplate((await params).occasion);
  return occasion ? occasionMetadata(occasion) : {};
}

export default async function OccasionTemplateRoute({ params }: { params: Promise<{ occasion: string }> }) {
  const occasion = getOccasionTemplate((await params).occasion);
  if (!occasion) notFound();
  return <OccasionTemplatePage occasion={occasion} />;
}
