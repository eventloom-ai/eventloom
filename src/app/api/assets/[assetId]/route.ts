import { NextRequest, NextResponse } from "next/server";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { canEditEvent } from "@/lib/studio-store";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: asset } = await client.from("assets").select("event_id, metadata").eq("id", assetId).maybeSingle();
  if (!asset?.event_id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [{ data: event }, { data: entitlement }, user] = await Promise.all([
    client.from("events").select("status").eq("id", asset.event_id).maybeSingle(),
    client.from("event_entitlements").select("status, expires_at").eq("event_id", asset.event_id).maybeSingle(),
    getServerUser(),
  ]);
  const published = event?.status === "published" && entitlement?.status === "active" && Boolean(entitlement.expires_at) && new Date(entitlement.expires_at).getTime() > Date.now();
  const editable = user ? await canEditEvent(asset.event_id, user.id) : false;
  if (!published && !editable) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const metadata = asset.metadata as { bucket?: string; path?: string } | null;
  if (!metadata?.bucket || !metadata.path) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data, error } = await client.storage.from(metadata.bucket).download(metadata.path);
  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(await data.arrayBuffer(), { headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": published ? "public, max-age=31536000, immutable" : "private, no-store" } });
}
