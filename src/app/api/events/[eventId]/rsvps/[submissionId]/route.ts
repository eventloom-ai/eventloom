import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { isSameOriginMutation } from "@/lib/security/request";
import { recordAuditEvent } from "@/lib/security/audit";
import { serviceSupabase } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string; submissionId: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { eventId, submissionId } = await params;
  const auth = await getAuthContext();
  if (!auth?.emailVerified || !hasRequiredMfa(auth)) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: event } = await client.from("events").select("id").eq("id", eventId).eq("owner_id", auth.user.id).maybeSingle();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data, error } = await client.from("rsvp_submissions").delete().eq("id", submissionId).eq("event_id", eventId).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await recordAuditEvent({ action: "rsvp.deleted", actorUserId: auth.user.id, actorType: "user", eventId, targetType: "rsvp_submission", targetId: submissionId });
  return NextResponse.json({ ok: true });
}
