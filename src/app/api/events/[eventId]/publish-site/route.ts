import { NextRequest, NextResponse } from "next/server";
import { canManageEvent } from "@/lib/organizations";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const client = serviceSupabase();
  if (!client) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: event } = await client
    .from("events")
    .select("owner_id, organization_id")
    .eq("id", eventId)
    .maybeSingle();

  const canManage =
    event &&
    (await canManageEvent({
      userId: user.id,
      ownerId: event.owner_id,
      organizationId: event.organization_id,
    }));

  if (!canManage) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await client
    .from("events")
    .update({ status: "published", rsvp_open: true, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  await client.from("page_artifacts").update({ status: "published" }).eq("event_id", eventId).eq("status", "draft");

  return NextResponse.json({ ok: true });
}
