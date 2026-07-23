import { NextRequest, NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/security/audit";
import { isSameOriginMutation } from "@/lib/security/request";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";

const ACTIVE_DOMAIN_STATUSES = ["registered", "vercel_pending", "ready"];

type StoredAsset = {
  metadata: {
    bucket?: unknown;
    path?: unknown;
  } | null;
};

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { eventId } = await params;
  const user = await getServerUser();
  const client = serviceSupabase();
  if (!user || !client) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: event } = await client
    .from("events")
    .select("id, owner_id, status")
    .eq("id", eventId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: activeDomain } = await client
    .from("domains")
    .select("id")
    .eq("event_id", eventId)
    .in("status", ACTIVE_DOMAIN_STATUSES)
    .limit(1)
    .maybeSingle();
  if (activeDomain) {
    return NextResponse.json({ error: "active_domain_transfer_required" }, { status: 409 });
  }

  const { data: assets, error: assetsError } = await client
    .from("assets")
    .select("metadata")
    .eq("event_id", eventId);
  if (assetsError) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  const storagePaths = (assets as StoredAsset[] | null ?? [])
    .filter((asset) => asset.metadata?.bucket === "event-assets-private" && typeof asset.metadata.path === "string")
    .map((asset) => asset.metadata!.path as string);
  if (storagePaths.length > 0) {
    const { error: storageError } = await client.storage.from("event-assets-private").remove(storagePaths);
    if (storageError) {
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
  }

  const { data: deleted, error } = await client
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !deleted) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  await recordAuditEvent({
    action: "event.deleted",
    actorUserId: user.id,
    actorType: "user",
    targetType: "event",
    targetId: eventId,
    metadata: { previousStatus: event.status, removedAssetCount: storagePaths.length },
  });
  return NextResponse.json({ ok: true });
}
