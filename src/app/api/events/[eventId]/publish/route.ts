import { NextRequest, NextResponse } from "next/server";
import { createLaunchCheckoutSession } from "@/lib/payments/stripe";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseServerClient, getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { canEditEvent } from "@/lib/studio-store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const wantsJson = req.headers.get("accept")?.includes("application/json") ?? false;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const platformAdmin = await isPlatformAdmin(user.id);
  const client = platformAdmin
    ? (await createSupabaseServerClient() ?? serviceSupabase())
    : (serviceSupabase() ?? await createSupabaseServerClient());
  if (client) {
    const [{ data: event }, { data: entitlement }] = await Promise.all([
      client.from("events").select("draft_version_id").eq("id", eventId).maybeSingle(),
      client.from("event_entitlements").select("status, expires_at").eq("event_id", eventId).maybeSingle(),
    ]);
    const active = entitlement?.status === "active" && entitlement.expires_at && new Date(entitlement.expires_at) > new Date();
    if (active || platformAdmin) {
      if (!event?.draft_version_id) return NextResponse.json({ error: "site_version_missing" }, { status: 409 });
      const { error: publishError } = await client
        .from("events")
        .update({ status: "published", rsvp_open: true, published_version_id: event.draft_version_id, published_at: new Date().toISOString() })
        .eq("id", eventId);
      if (publishError) {
        console.error("[publish] failed to promote draft", { eventId, code: publishError.code });
        return NextResponse.json({ error: "publish_failed" }, { status: 500 });
      }
      if (wantsJson) return NextResponse.json({ ok: true, published: true, free: platformAdmin });
      return NextResponse.redirect(new URL(`/app/events/${eventId}/studio?published=1`, req.url), { status: 303 });
    }
  }

  const checkout = await createLaunchCheckoutSession({ eventId, ownerId: user.id, customerEmail: user.email });
  if (!checkout.ok) {
    return NextResponse.json({ error: checkout.error }, { status: checkout.error === "not_found" ? 404 : 409 });
  }

  if (wantsJson) return NextResponse.json({ ok: true, checkout_url: checkout.url });
  return NextResponse.redirect(checkout.url!, { status: 303 });
}
