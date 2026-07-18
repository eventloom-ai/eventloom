import { NextResponse } from "next/server";
import { appendRunEvent, canEditEvent, getStudioRun, requestStudioRunCancellation } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: Promise<{ eventId: string; runId: string }> }) {
  const { eventId, runId } = await params;
  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const run = await getStudioRun(runId);
  if (!run || run.event_id !== eventId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const ok = await requestStudioRunCancellation(runId);
  if (ok) await appendRunEvent(runId, eventId, "status", { stage: "stopping", message: "Stopping after the current step…" });
  return NextResponse.json({ ok });
}
