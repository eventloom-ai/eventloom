import { NextRequest, NextResponse } from "next/server";
import { createLaunchCheckoutSession } from "@/lib/payments/stripe";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { isEventOwner } from "@/lib/payments/billing";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { event_id?: string } | null;
  if (!body?.event_id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (await isPlatformAdmin(user.id)) {
    if (!(await isEventOwner(body.event_id, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const client = serviceSupabase();
    if (!client) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    const { data: event } = await client.from("events").select("draft_version_id").eq("id", body.event_id).maybeSingle();
    if (!event?.draft_version_id) return NextResponse.json({ error: "site_version_missing" }, { status: 409 });
    const { error } = await client.from("events").update({ status: "published", rsvp_open: true, published_version_id: event.draft_version_id, published_at: new Date().toISOString() }).eq("id", body.event_id);
    if (error) return NextResponse.json({ error: "publish_failed" }, { status: 500 });
    return NextResponse.json({ ok: true, published: true, free: true });
  }
  const session = await createLaunchCheckoutSession({ eventId: body.event_id, ownerId: user.id, customerEmail: user.email });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.error === "not_found" ? 404 : 409 });
  }

  return NextResponse.json(session);
}
