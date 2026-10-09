import "server-only";
import sharp from "sharp";
import { saveLocalDemoAsset } from "@/lib/local-demo-store";
import type { serviceSupabase } from "@/lib/supabase/server";

export const allowedEventImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
// Event pages never show an image wider than this; larger uploads only cost storage and egress.
export const MAX_EVENT_IMAGE_EDGE_PX = 2_400;
const EVENT_IMAGE_WEBP_QUALITY = 80;

type StorageClient = NonNullable<ReturnType<typeof serviceSupabase>>;

async function processEventImageBuffer(file: File): Promise<{ output: Buffer; metadata: { width: number; height: number } } | { error: string }> {
  if (!allowedEventImageTypes.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) return { error: "invalid_image" };
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { failOn: "warning", limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > 10_000 || metadata.height > 10_000 || (metadata.pages && metadata.pages > 1)) throw new Error("invalid_dimensions");
    // rotate() bakes in the EXIF orientation before resizing; sharp drops EXIF/GPS/ICC metadata from the output by default.
    const { data: output, info } = await image
      .rotate()
      .resize({ width: MAX_EVENT_IMAGE_EDGE_PX, height: MAX_EVENT_IMAGE_EDGE_PX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: EVENT_IMAGE_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return { output, metadata: { width: info.width, height: info.height } };
  } catch {
    return { error: "invalid_image" };
  }
}

// Demo mode has no Supabase storage backend, so uploaded images are inlined as data URIs
// and held only in the client's in-memory document state instead of being served back by id.
export async function processEventImageAsDataUrl(file: File): Promise<{ id: string; url: string } | { error: string }> {
  const processed = await processEventImageBuffer(file);
  if ("error" in processed) return processed;
  return { id: crypto.randomUUID(), url: `data:image/webp;base64,${processed.output.toString("base64")}` };
}

// Demo mode (no Supabase): keep the processed image in the in-memory demo store and serve it by id from
// /api/assets/<id>, so demo events get the same kind of image URL as real ones.
export async function storeDemoEventImage(file: File): Promise<{ id: string; url: string } | { error: string }> {
  const processed = await processEventImageBuffer(file);
  if ("error" in processed) return processed;
  const id = crypto.randomUUID();
  saveLocalDemoAsset(id, new Uint8Array(processed.output));
  return { id, url: `/api/assets/${id}` };
}

export async function processAndStoreEventImage(client: StorageClient, eventId: string, file: File): Promise<{ id: string; url: string } | { error: string }> {
  const processed = await processEventImageBuffer(file);
  if ("error" in processed) return processed;
  const { output, metadata } = processed;

  const path = `${eventId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await client.storage.from("event-assets-private").upload(path, output, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
  if (uploadError) return { error: "upload_failed" };

  const { data: asset, error: assetError } = await client
    .from("assets")
    .insert({ event_id: eventId, kind: "site-image", url: "pending", metadata: { bucket: "event-assets-private", path, mediaType: "image/webp", size: output.length, width: metadata.width, height: metadata.height } })
    .select("id")
    .single();
  if (assetError || !asset) {
    await client.storage.from("event-assets-private").remove([path]);
    return { error: "upload_failed" };
  }

  const url = `/api/assets/${asset.id}`;
  await client.from("assets").update({ url }).eq("id", asset.id);
  return { id: asset.id as string, url };
}
