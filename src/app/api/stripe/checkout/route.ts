import { NextRequest, NextResponse } from "next/server";
import { createLaunchCheckoutSession } from "@/lib/payments/stripe";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { isEventOwner } from "@/lib/payments/billing";
import { legalIdentityConfigured, publicCheckoutEnabled } from "@/lib/env";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { clientIpHash, isSameOriginMutation, readJsonWithinLimit } from "@/lib/security/request";
import { domainRegistrantSchema } from "@/lib/domains/registrant";
import { hasCreatorLegalOnboarding } from "@/lib/security/creator-legal";
import { hasCompleteEventPrivacyNotice } from "@/lib/privacy/event-privacy";
import { LEGAL_VERSION } from "@/lib/legal-documents";

export async function POST(req: NextRequest) {
  if (!publicCheckoutEnabled() || !legalIdentityConfigured()) return NextResponse.json({ error: "checkout_unavailable" }, { status: 503 });
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsedBody = await readJsonWithinLimit<{ event_id?: string; domain?: string | null; registrant?: unknown; legalAccepted?: boolean; legalVersion?: string }>(req, 8_192);
  if (!parsedBody.ok) return NextResponse.json({ error: "invalid" }, { status: parsedBody.error === "payload_too_large" ? 413 : 400 });
  const body = parsedBody.data;
  if (!body?.event_id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const auth = await getAuthContext();
  const user = auth?.user ?? await getServerUser();
  if (!auth || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!auth.emailVerified || !hasRequiredMfa(auth)) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  if (!(await hasCreatorLegalOnboarding(user.id))) return NextResponse.json({ error: "legal_onboarding_required" }, { status: 403 });
  if (!(await hasCompleteEventPrivacyNotice(body.event_id))) return NextResponse.json({ error: "event_privacy_notice_required" }, { status: 409 });
  if (body.legalAccepted !== true || body.legalVersion !== LEGAL_VERSION) return NextResponse.json({ error: "legal_acceptance_required" }, { status: 400 });
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
  const registrant = body.domain ? domainRegistrantSchema.safeParse(body.registrant) : null;
  if (body.domain && !registrant?.success) return NextResponse.json({ error: "registrant_invalid" }, { status: 400 });
  const session = await createLaunchCheckoutSession({ eventId: body.event_id, ownerId: user.id, customerEmail: user.email, domain: body.domain, registrant: registrant?.data, acceptance: { version: body.legalVersion, ipHash: clientIpHash(req), userAgentClass: (req.headers.get("user-agent") ?? "unknown").slice(0, 160) } });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.error === "not_found" ? 404 : 409 });
  }

  return NextResponse.json(session);
}
