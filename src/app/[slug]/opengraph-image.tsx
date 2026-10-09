import { eventOgCard, ogImageAlt, ogImageId } from "@/lib/og/event-og-card";
import { renderOgImage } from "@/lib/og/render-og-image";
import { loadEventBySlug } from "@/lib/public-event";

/**
 * Share card for a guest page. The image id is a hash of what the card draws, so each published version gets its own
 * URL: the image can be cached per id, and share previews refresh on republish. Drafts, archived and missing events
 * get the generic card, and so does any id that is not the event's current card (an old or guessed URL).
 */

// Cached per id; re-checked daily so an id stops drawing its card after the event is unpublished or archived.
export const revalidate = 86400;

export async function generateImageMetadata({ params }: { params: { slug: string } }) {
  const card = eventOgCard(await loadEventBySlug(params.slug));
  return [{ id: ogImageId(card), alt: ogImageAlt(card), size: { width: 1200, height: 630 }, contentType: "image/png" }];
}

export default async function Image({ params, id }: { params: Promise<{ slug: string }>; id: Promise<string | number> }) {
  const [{ slug }, imageId] = await Promise.all([params, id]);
  const card = eventOgCard(await loadEventBySlug(slug));
  return renderOgImage(String(imageId) === ogImageId(card) ? card : null);
}
