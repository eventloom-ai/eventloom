import { NextRequest, NextResponse } from "next/server";
import { canEditEvent } from "@/lib/studio-store";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${eventId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("event-assets").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  const { data } = client.storage.from("event-assets").getPublicUrl(path);
  const { data: asset } = await client.from("assets").insert({ event_id: eventId, kind: "site-image", url: data.publicUrl, metadata: { path, name: file.name, mediaType: file.type, size: file.size } }).select("id").single();
  return NextResponse.json({ id: asset?.id ?? null, url: data.publicUrl });
}
