import { NextRequest, NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/supabase/server";
import { resolveEventBySlug } from "@/lib/tenancy";
import { validateRsvpPayload } from "@/lib/validation";
import { publicRsvpEnabled } from "@/lib/env";
import { verifyPublicRsvpToken } from "@/lib/security/rsvp-token";
import { clientIpHash, readJsonWithinLimit } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { TURNSTILE_ACTIONS } from "@/lib/security/turnstile-shared";

export async function POST(req: NextRequest) {
  if (!publicRsvpEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const parsedBody = await readJsonWithinLimit(req, 32_768);
  if (!parsedBody.ok) return NextResponse.json({ error: "invalid" }, { status: parsedBody.error === "payload_too_large" ? 413 : 400 });
  const body = parsedBody.data;
  const validated = validateRsvpPayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const payload = validated.payload;
  const token = verifyPublicRsvpToken(payload.form_token);
  if (!token) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const event = await resolveEventBySlug(token.slug);
  if (!event || event.id !== token.eventId) return NextResponse.json({ error: "unavailable" }, { status: 404 });

  if (event.status !== "published" || !event.rsvp_open) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const remoteIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim();
  if (!(await verifyTurnstile(payload.turnstile_token, {
    expectedAction: TURNSTILE_ACTIONS.publicRsvp,
    expectedHostname: req.nextUrl.hostname,
    remoteIp,
  }))) return NextResponse.json({ error: "verification_failed" }, { status: 400 });

  const client = serviceSupabase();
  if (!client) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const { error } = await client.rpc("submit_public_rsvp", {
    p_event_id: event.id,
    p_idempotency_key: payload.idempotency_key,
    p_first_name: payload.first_name,
    p_last_name: payload.last_name,
    p_email: payload.email || null,
    p_phone: payload.phone || null,
    p_is_attending: payload.is_attending,
    p_party_size: payload.party_size,
    p_guest_names: payload.guest_names,
    p_answers: payload.answers,
    p_ip_hash: clientIpHash(req),
    p_user_agent_class: (req.headers.get("user-agent") ?? "unknown").slice(0, 160),
  });
  if (error) return NextResponse.json({ error: error.message.includes("rate_limit") ? "try_later" : "server" }, { status: error.message.includes("rate_limit") ? 429 : 500 });

  return NextResponse.json({ ok: true });
}
