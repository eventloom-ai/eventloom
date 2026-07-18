import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { reserveBuildCredit } from "@/lib/payments/billing";
import { executeStudioRun } from "@/lib/studio-agent";
import { canEditEvent, createBuilderMessage, createStudioRun, loadStudioState, updateStudioRun } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { message?: string; baseVersionId?: string; selectedNodeIds?: string[] } | null;
  const message = body?.message?.trim() ?? "";
  if (!message || message.length > 8000 || !body?.baseVersionId) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const state = await loadStudioState(eventId, user.id);
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (state.revision.id !== body.baseVersionId) return NextResponse.json({ error: "version_conflict", state }, { status: 409 });
  if (state.activeRun) return NextResponse.json({ error: "run_in_progress", runId: state.activeRun.id }, { status: 409 });

  const selectedNodeIds = (body.selectedNodeIds ?? []).filter((value): value is string => typeof value === "string").slice(0, 8);
  const runId = await createStudioRun({ eventId, ownerId: user.id, baseVersionId: state.revision.id, prompt: message, selectedNodeIds });
  if (!runId) return NextResponse.json({ error: "run_in_progress" }, { status: 409 });
  const credit = await reserveBuildCredit(user.id, eventId);
  if (!credit.ok) {
    await updateStudioRun(runId, { status: "failed", error: credit.error, completed_at: new Date().toISOString() });
    return NextResponse.json({ error: credit.error }, { status: 402 });
  }
  const userMessage = await createBuilderMessage({ eventId, runId, role: "user", content: message, selectedNodeIds, versionId: state.revision.id, ownerId: user.id });
  after(async () => executeStudioRun({ jobId: runId, eventId, ownerId: user.id, prompt: message, selectedNodeIds }));
  return NextResponse.json({ runId, message: userMessage, remainingCreditCents: credit.remainingCents }, { status: 202 });
}
