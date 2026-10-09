import { renderOgImage } from "@/lib/og/render-og-image";
import { getOccasionTemplate, occasionOgCard, occasionTemplates } from "@/lib/occasion-templates";

// The template's sample event, drawn the way a published event's share card is. Prerendered with the page.
export const dynamicParams = false;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Event website template with RSVP, by Eventloom";

export function generateStaticParams() {
  return occasionTemplates.map((occasion) => ({ occasion: occasion.slug }));
}

export default async function Image({ params }: { params: Promise<{ occasion: string }> }) {
  const occasion = getOccasionTemplate((await params).occasion);
  return renderOgImage(occasion ? occasionOgCard(occasion) : null);
}
