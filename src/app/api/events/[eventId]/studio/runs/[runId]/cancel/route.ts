import { NextRequest, NextResponse } from "next/server";
import { appendRunEvent, canEditEvent, getStudioRun, requestStudioRunCancellation } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";

import { isSameOriginMutation } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string; runId: string }> }) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { eventId, runId } = await params;
  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const limited = await enforceRateLimit(req, RATE_LIMITS.studioCancel, { userId: user.id });
  if (limited) return limited;
  const run = await getStudioRun(runId);
  if (!run || run.event_id !== eventId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const ok = await requestStudioRunCancellation(runId);
  if (ok) await appendRunEvent(runId, eventId, "status", { stage: "stopping", message: "Stopping after the current step…" });
  return NextResponse.json({ ok });
}
