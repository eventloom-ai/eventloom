import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";
import { recordAuditEvent } from "@/lib/security/audit";
import { serviceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function verifiedCreator() {
  const auth = await getAuthContext();
  return auth?.emailVerified && hasRequiredMfa(auth) ? auth : null;
}

export async function GET() {
  const auth = await verifiedCreator();
  if (!auth) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const userId = auth.user.id;
  const ownedEvents = await client.from("events").select("id").eq("owner_id", userId);
  if (ownedEvents.error) return NextResponse.json({ error: "export_failed" }, { status: 500 });
  const eventIds = (ownedEvents.data ?? []).map((row) => row.id);
  const ordersQuery = eventIds.length
    ? client.from("orders").select("id, event_id, status, kind, amount_total, currency, created_at").in("event_id", eventIds)
    : Promise.resolve({ data: [], error: null });
  const [profile, events, memberships, orders, acceptances, privacyRequests] = await Promise.all([
    client.from("profiles").select("id, email, full_name, created_at").eq("id", userId).maybeSingle(),
    client.from("events").select("id, slug, status, event_type, timezone, starts_at, ends_at, created_at, updated_at").eq("owner_id", userId),
    client.from("event_members").select("event_id, role, created_at").eq("user_id", userId),
    ordersQuery,
    client.from("legal_acceptances").select("document_id, order_id, accepted_at, user_agent_class").eq("user_id", userId),
    client.from("privacy_requests").select("id, request_type, status, due_at, completed_at, created_at").eq("requester_user_id", userId),
  ]);
  const failed = [profile, events, memberships, orders, acceptances, privacyRequests].some((result) => result.error);
  if (failed) return NextResponse.json({ error: "export_failed" }, { status: 500 });
  await recordAuditEvent({ action: "account.exported", actorUserId: userId, actorType: "user" });
  return NextResponse.json({
    exported_at: new Date().toISOString(),
    account: { id: userId, email: auth.user.email, profile: profile.data },
    events: events.data,
    memberships: memberships.data,
    orders: orders.data,
    legal_acceptances: acceptances.data,
    privacy_requests: privacyRequests.data,
  }, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="eventloom-account-${userId}.json"`,
    },
  });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request) || !requestWithinLimit(request, 2_000)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const auth = await verifiedCreator();
  if (!auth) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;
  if (body?.confirmation !== "DELETE MY ACCOUNT") {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const { data: assets } = await client
    .from("assets")
    .select("metadata, events!inner(owner_id)")
    .eq("events.owner_id", auth.user.id);
  const storagePaths = (assets ?? []).flatMap((asset) => {
    const metadata = asset.metadata as { bucket?: unknown; path?: unknown } | null;
    return metadata?.bucket === "event-assets-private" && typeof metadata.path === "string" ? [metadata.path] : [];
  });
  const { data, error } = await client.rpc("delete_creator_account", { p_user_id: auth.user.id });
  if (error) {
    const activeDomain = error.message.includes("active_domain_transfer_required");
    return NextResponse.json({ error: activeDomain ? "active_domain_transfer_required" : "deletion_failed" }, { status: activeDomain ? 409 : 500 });
  }
  if (storagePaths.length) await client.storage.from("event-assets-private").remove(storagePaths);
  const deletion = await client.auth.admin.deleteUser(auth.user.id);
  if (deletion.error) return NextResponse.json({ error: "identity_deletion_failed" }, { status: 500 });
  return NextResponse.json({ ok: data === true });
}
