import "server-only";
import sharp, { type Metadata } from "sharp";
import type { serviceSupabase } from "@/lib/supabase/server";

export const allowedEventImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type StorageClient = NonNullable<ReturnType<typeof serviceSupabase>>;

export async function processAndStoreEventImage(client: StorageClient, eventId: string, file: File): Promise<{ id: string; url: string } | { error: string }> {
  if (!allowedEventImageTypes.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) return { error: "invalid_image" };

  let output: Buffer;
  let metadata: Metadata;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { failOn: "warning", limitInputPixels: 40_000_000 });
    metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > 10_000 || metadata.height > 10_000 || (metadata.pages && metadata.pages > 1)) throw new Error("invalid_dimensions");
    output = await image.rotate().webp({ quality: 88 }).toBuffer();
  } catch {
    return { error: "invalid_image" };
  }

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
