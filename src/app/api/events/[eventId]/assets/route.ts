import { NextRequest, NextResponse } from "next/server";
import { canEditEvent } from "@/lib/studio-store";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";
import sharp, { type Metadata } from "sharp";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 11 * 1024 * 1024)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const { eventId } = await params;
  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  let output: Buffer;
  let metadata: Metadata;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { failOn: "warning", limitInputPixels: 40_000_000 });
    metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > 10_000 || metadata.height > 10_000 || metadata.pages && metadata.pages > 1) throw new Error("invalid_dimensions");
    output = await image.rotate().webp({ quality: 88 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }
  const path = `${eventId}/${crypto.randomUUID()}.webp`;
  const { error } = await client.storage.from("event-assets-private").upload(path, output, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
  if (error) return NextResponse.json({ error: "upload_failed" }, { status: 422 });
  const { data: asset, error: assetError } = await client.from("assets").insert({ event_id: eventId, kind: "site-image", url: "pending", metadata: { bucket: "event-assets-private", path, mediaType: "image/webp", size: output.length, width: metadata.width, height: metadata.height } }).select("id").single();
  if (assetError || !asset) {
    await client.storage.from("event-assets-private").remove([path]);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
  const url = `/api/assets/${asset.id}`;
  await client.from("assets").update({ url }).eq("id", asset.id);
  return NextResponse.json({ id: asset.id, url });
}
