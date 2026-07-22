import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { clientIpHash, isSameOriginMutation, readJsonWithinLimit, requestWithinLimit } from "@/lib/security/request";
import { encryptSensitiveJson } from "@/lib/security/encryption";
import { getAuthContext } from "@/lib/security/auth";
import { serviceSupabase } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/security/audit";

const requestSchema = z.object({
  requestType: z.enum(["access", "correction", "deletion", "information", "appeal"]),
  contact: z.string().trim().min(3).max(200),
  eventSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(63).optional(),
  details: z.string().trim().min(1).max(2000),
  turnstileToken: z.string().max(4096).default(""),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request) || !requestWithinLimit(request, 12_000)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const parsedBody = await readJsonWithinLimit(request, 12_000);
  if (!parsedBody.ok) return NextResponse.json({ error: "invalid_request" }, { status: parsedBody.error === "payload_too_large" ? 413 : 400 });
  const parsed = requestSchema.safeParse(parsedBody.data);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (!(await verifyTurnstile(parsed.data.turnstileToken))) {
    return NextResponse.json({ error: "verification_failed" }, { status: 400 });
  }
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const auth = await getAuthContext();
  const eventResult = parsed.data.eventSlug
    ? await client.from("events").select("id").eq("slug", parsed.data.eventSlug).maybeSingle()
    : { data: null };
  const ciphertext = encryptSensitiveJson({ contact: parsed.data.contact, details: parsed.data.details });
  if (!ciphertext) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data, error } = await client.from("privacy_requests").insert({
    requester_user_id: auth?.user.id ?? null,
    event_id: eventResult.data?.id ?? null,
    request_type: parsed.data.requestType,
    contact_ciphertext: ciphertext,
  }).select("id, due_at").single();
  if (error || !data) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  await recordAuditEvent({
    action: "privacy.request.received",
    actorUserId: auth?.user.id,
    actorType: auth ? "user" : "guest",
    eventId: eventResult.data?.id,
    targetType: "privacy_request",
    targetId: data.id,
    metadata: { request_type: parsed.data.requestType, ip_hash_present: Boolean(clientIpHash(request)) },
  });
  return NextResponse.json({ request_id: data.id, due_at: data.due_at }, { status: 201 });
}
