import { NextRequest, NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/supabase/server";
import { resolveEventBySlug } from "@/lib/tenancy";
import { validateRsvpPayload } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const validated = validateRsvpPayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const payload = validated.payload;
  const event = payload.slug ? await resolveEventBySlug(payload.slug) : null;
  const eventId = payload.event_id ?? event?.id;
  if (!eventId) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  if (event && (event.status !== "published" || !event.rsvp_open)) {
    return NextResponse.json({ error: "rsvp_closed" }, { status: 403 });
  }

  const client = serviceSupabase();
  if (!client) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const { data: submission, error } = await client
    .from("rsvp_submissions")
    .insert({
      event_id: eventId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email || null,
      phone: payload.phone || null,
      is_attending: payload.is_attending,
      party_size: payload.party_size,
      answers: payload.answers,
    })
    .select("id")
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  if (payload.guest_names.length > 0) {
    const { error: guestError } = await client.from("rsvp_guests").insert(
      payload.guest_names.map((name) => ({
        submission_id: submission.id,
        event_id: eventId,
        name,
      })),
    );

    if (guestError) {
      return NextResponse.json({ error: "server" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
