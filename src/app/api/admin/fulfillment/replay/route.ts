import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processVerifiedStripeEvent } from "@/app/api/stripe/webhook/route";
import { stripeClient } from "@/lib/payments/stripe";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { recordAuditEvent } from "@/lib/security/audit";
import { isSameOriginMutation, readJsonWithinLimit } from "@/lib/security/request";

const replaySchema = z.object({ eventId: z.string().regex(/^evt_[A-Za-z0-9_]+$/).max(255) });

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth || !hasRequiredMfa(auth) || !(await isPlatformAdmin(auth.user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const parsedBody = await readJsonWithinLimit(request, 2_000);
  const parsed = parsedBody.ok ? replaySchema.safeParse(parsedBody.data) : null;
  if (!parsed?.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const stripe = stripeClient();
  if (!stripe) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const event = await stripe.events.retrieve(parsed.data.eventId).catch(() => null);
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await recordAuditEvent({ action: "fulfillment.replay.requested", actorUserId: auth.user.id, actorType: "admin", metadata: { provider_event_id: parsed.data.eventId } });
  return processVerifiedStripeEvent(event, "manual-replay");
}
