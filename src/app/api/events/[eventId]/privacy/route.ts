import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canEditEvent } from "@/lib/studio-store";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { isSameOriginMutation, readJsonWithinLimit } from "@/lib/security/request";
import { recordAuditEvent } from "@/lib/security/audit";

const settingsSchema = z.object({
  controllerLegalName: z.string().trim().min(2).max(160),
  privacyContact: z.string().trim().email().max(160),
  collectionPurpose: z.string().trim().min(10).max(500),
  optionalFieldJustification: z.string().trim().min(10).max(500),
  endsAt: z.string().datetime(),
  timezone: z.string().trim().min(1).max(80),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { eventId } = await params;
  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const parsedBody = await readJsonWithinLimit(request, 4_096);
  const parsed = parsedBody.ok ? settingsSchema.safeParse(parsedBody.data) : null;
  if (!parsed?.success || new Date(parsed.data.endsAt) <= new Date()) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const [settingsResult, eventResult] = await Promise.all([
    client.from("event_settings").update({ controller_legal_name: parsed.data.controllerLegalName, privacy_contact: parsed.data.privacyContact, collection_purpose: parsed.data.collectionPurpose, optional_field_justification: parsed.data.optionalFieldJustification }).eq("event_id", eventId),
    client.from("events").update({ ends_at: parsed.data.endsAt, event_ends_at: parsed.data.endsAt, timezone: parsed.data.timezone, event_timezone: parsed.data.timezone, updated_at: new Date().toISOString() }).eq("id", eventId),
  ]);
  if (settingsResult.error || eventResult.error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  await recordAuditEvent({ action: "event.privacy_settings.updated", actorUserId: user.id, actorType: "user", eventId, targetType: "event", targetId: eventId });
  return NextResponse.json({ ok: true });
}
