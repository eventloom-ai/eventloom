import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { defaultEventConfig } from "@/lib/ai/generator";
import { createEventRecord } from "@/lib/agent/tools";
import { reserveBuildCredit } from "@/lib/payments/billing";
import { normalizeSlugInput, suggestSlug } from "@/lib/slug-suggest";
import { executeStudioRun } from "@/lib/studio-agent";
import { createBuilderMessage, createStudioRun, loadStudioState, updateStudioRun } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";
import { REFERRAL_COOKIE, attachReferralDraft, claimReferralJourney } from "@/lib/referrals/store";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 16_384)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { prompt?: string; slug?: string; referral_journey?: string } | null;
  const prompt = body?.prompt?.trim() ?? "";
  if (!prompt || prompt.length > 8000) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const baseSlug = normalizeSlugInput(body?.slug || suggestSlug(prompt) || "my-event");
  const slug = baseSlug.length >= 3 ? baseSlug : `event-${Date.now().toString(36)}`;
  const created = await createEventRecord({ slug, config: defaultEventConfig(prompt), ownerId: user.id });
  if (!created.event) return NextResponse.json({ error: created.error?.includes("duplicate") ? "slug_taken" : created.error ?? "create_event_failed" }, { status: created.error?.includes("duplicate") ? 409 : 500 });
  const referralReference = req.cookies.get(REFERRAL_COOKIE)?.value ?? body?.referral_journey?.slice(0, 4_096);
  await claimReferralJourney({
    reference: referralReference,
    userId: user.id,
    userCreatedAt: user.created_at,
  }).catch(() => null);
  await attachReferralDraft({ userId: user.id, eventId: created.event.id }).catch(() => false);
  const state = await loadStudioState(created.event.id, user.id);
  if (!state) return NextResponse.json({ error: "studio_create_failed" }, { status: 500 });
  const runId = await createStudioRun({ eventId: created.event.id, ownerId: user.id, baseVersionId: state.revision.id, prompt, selectedNodeIds: [], kind: "initial" });
  if (!runId) return NextResponse.json({ eventId: created.event.id, runId: null, slug }, { status: 201 });
  const credit = await reserveBuildCredit(user.id, created.event.id);
  if (!credit.ok) {
    await updateStudioRun(runId, { status: "failed", error: credit.error, completed_at: new Date().toISOString() });
    return NextResponse.json({ eventId: created.event.id, runId: null, slug, warning: credit.error }, { status: 201 });
  }
  await createBuilderMessage({ eventId: created.event.id, runId, role: "user", content: prompt, versionId: state.revision.id, ownerId: user.id });
  after(async () => executeStudioRun({ jobId: runId, eventId: created.event!.id, ownerId: user.id, prompt, selectedNodeIds: [] }));
  return NextResponse.json({ eventId: created.event.id, runId, slug }, { status: 202 });
}
