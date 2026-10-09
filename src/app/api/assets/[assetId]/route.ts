import { NextRequest, NextResponse } from "next/server";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { canEditEvent } from "@/lib/studio-store";
import { EVENT_ASSET_BUCKET, isEventAssetPath } from "@/lib/asset-paths";
import { getLocalDemoAsset } from "@/lib/local-demo-store";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const client = serviceSupabase();
  if (!client) {
    // Demo mode only: images uploaded during a local build live in the in-memory demo store.
    const demo = getLocalDemoAsset(assetId);
    return demo
      ? new NextResponse(Buffer.from(demo), { headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } })
      : NextResponse.json({ error: "not_found" }, { status: 404 });
  }
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
  if (!isEventAssetPath(metadata, asset.event_id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data, error } = await client.storage.from(EVENT_ASSET_BUCKET).download(metadata.path);
  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Asset paths are content-unique, so published copies can live at the CDN instead of re-running this function.
  const caching: Record<string, string> = published ?{ "Cache-Control": "public, max-age=31536000, immutable", "CDN-Cache-Control": "public, s-maxage=86400" } : { "Cache-Control": "private, no-store" };
  return new NextResponse(await data.arrayBuffer(), { headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", ...caching } });
}
