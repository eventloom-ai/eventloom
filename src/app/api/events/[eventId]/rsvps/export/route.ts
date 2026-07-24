import { NextResponse } from "next/server";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { recordAuditEvent } from "@/lib/security/audit";
import { safeCsvCell } from "@/lib/csv";
import { serviceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const auth = await getAuthContext();
  if (!auth?.emailVerified || !hasRequiredMfa(auth)) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: event } = await client.from("events").select("id, slug, owner_id").eq("id", eventId).eq("owner_id", auth.user.id).maybeSingle();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data, error } = await client.from("rsvp_submissions").select("id, first_name, last_name, email, phone, is_attending, party_size, status, created_at, rsvp_guests(name), rsvp_answers(field_key, value)").eq("event_id", eventId).order("created_at");
  if (error) return NextResponse.json({ error: "export_failed" }, { status: 500 });
  const header = ["submission_id", "first_name", "last_name", "email", "phone", "attending", "party_size", "status", "guests", "answers", "created_at"];
  const rows = (data ?? []).map((row) => [row.id, row.first_name, row.last_name, row.email, row.phone, row.is_attending, row.party_size, row.status, row.rsvp_guests, row.rsvp_answers, row.created_at].map(safeCsvCell).join(","));
  await recordAuditEvent({ action: "rsvp.exported", actorUserId: auth.user.id, actorType: "user", eventId, targetType: "event", targetId: eventId, metadata: { row_count: rows.length } });
  return new NextResponse([header.join(","), ...rows].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${event.slug}-rsvps.csv"`, "Cache-Control": "private, no-store, max-age=0" } });
}
