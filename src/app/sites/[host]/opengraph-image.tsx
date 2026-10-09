import { eventOgCard, ogImageAlt, ogImageId } from "@/lib/og/event-og-card";
import { renderOgImage } from "@/lib/og/render-og-image";
import { loadEventByHost } from "@/lib/public-event";
import { normalizeHost } from "@/lib/tenancy";

// Custom domains and subdomains rewrite every path to the event page, so this image is always linked on the app
// domain (metadataBase), e.g. https://eventloom.co/sites/<host>/opengraph-image/<id>. Same rules as /[slug].
export const revalidate = 86400;

function hostOf(raw: string) {
  try {
    return normalizeHost(decodeURIComponent(raw));
  } catch {
    return "";
  }
}

export async function generateImageMetadata({ params }: { params: { host: string } }) {
  const card = eventOgCard(await loadEventByHost(hostOf(params.host)));
  return [{ id: ogImageId(card), alt: ogImageAlt(card), size: { width: 1200, height: 630 }, contentType: "image/png" }];
}

export default async function Image({ params, id }: { params: Promise<{ host: string }>; id: Promise<string | number> }) {
  const [{ host }, imageId] = await Promise.all([params, id]);
  const card = eventOgCard(await loadEventByHost(hostOf(host)));
  return renderOgImage(String(imageId) === ogImageId(card) ? card : null);
}
