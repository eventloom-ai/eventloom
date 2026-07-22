import { NextRequest, NextResponse } from "next/server";
import { createLaunchCheckoutSession } from "@/lib/payments/stripe";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseServerClient, serviceSupabase } from "@/lib/supabase/server";
import { canEditEvent } from "@/lib/studio-store";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { hasCreatorLegalOnboarding } from "@/lib/security/creator-legal";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";
import { legalIdentityConfigured, publicCheckoutEnabled } from "@/lib/env";
import { domainRegistrantSchema } from "@/lib/domains/registrant";
import { clientIpHash } from "@/lib/security/request";
import { hasCompleteEventPrivacyNotice } from "@/lib/privacy/event-privacy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 8_192)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const { eventId } = await params;
  const wantsJson = req.headers.get("accept")?.includes("application/json") ?? false;
  const body = req.headers.get("content-type")?.includes("application/json")
    ? await req.json().catch(() => null) as { domain?: string | null; registrant?: unknown; legalAccepted?: boolean; legalVersion?: string } | null
    : null;
  const auth = await getAuthContext();
  const user = auth?.user;
  if (!auth || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!auth.emailVerified || !hasRequiredMfa(auth)) return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  if (!(await hasCreatorLegalOnboarding(auth.user.id))) return NextResponse.json({ error: "legal_onboarding_required" }, { status: 403 });
  if (!(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await hasCompleteEventPrivacyNotice(eventId))) return NextResponse.json({ error: "event_privacy_notice_required" }, { status: 409 });

  const platformAdmin = await isPlatformAdmin(user.id);
  const client = platformAdmin
    ? (await createSupabaseServerClient() ?? serviceSupabase())
    : (serviceSupabase() ?? await createSupabaseServerClient());
  if (client) {
    const [{ data: event }, { data: entitlement }] = await Promise.all([
      client.from("events").select("draft_version_id, ends_at, event_ends_at").eq("id", eventId).maybeSingle(),
      client.from("event_entitlements").select("status, expires_at").eq("event_id", eventId).maybeSingle(),
    ]);
    const active = entitlement?.status === "active" && entitlement.expires_at && new Date(entitlement.expires_at) > new Date();
    if (!event?.event_ends_at && !event?.ends_at) return NextResponse.json({ error: "event_end_required" }, { status: 409 });
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

  if (!publicCheckoutEnabled() || !legalIdentityConfigured()) return NextResponse.json({ error: "checkout_unavailable" }, { status: 503 });
  if (body?.legalAccepted !== true || body.legalVersion !== "2026-07-22-beta") return NextResponse.json({ error: "legal_acceptance_required" }, { status: 400 });
  const registrant = body?.domain ? domainRegistrantSchema.safeParse(body.registrant) : null;
  if (body?.domain && !registrant?.success) return NextResponse.json({ error: "registrant_invalid" }, { status: 400 });
  const checkout = await createLaunchCheckoutSession({ eventId, ownerId: user.id, customerEmail: user.email, domain: body?.domain, registrant: registrant?.data, acceptance: { version: body.legalVersion, ipHash: clientIpHash(req), userAgentClass: (req.headers.get("user-agent") ?? "unknown").slice(0, 160) } });
  if (!checkout.ok) {
    return NextResponse.json({ error: checkout.error }, { status: checkout.error === "not_found" ? 404 : 409 });
  }

  if (wantsJson) return NextResponse.json({ ok: true, checkout_url: checkout.url });
  return NextResponse.redirect(checkout.url!, { status: 303 });
}
