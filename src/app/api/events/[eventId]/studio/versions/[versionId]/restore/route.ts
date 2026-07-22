import { NextRequest, NextResponse } from "next/server";
import { canEditEvent, commitStudioRevision, loadStudioState } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string; versionId: string }> }) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 4_096)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const { eventId, versionId } = await params;
  const user = await getServerUser();
  if (!(await canEditEvent(eventId, user?.id ?? null))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { baseVersionId?: string } | null;
  const state = await loadStudioState(eventId, user?.id ?? null);
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!body?.baseVersionId || state.revision.id !== body.baseVersionId) return NextResponse.json({ error: "version_conflict", state }, { status: 409 });
  const target = state.versions.find((version) => version.id === versionId);
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const result = await commitStudioRevision({ eventId, ownerId: user?.id ?? null, baseVersionId: state.revision.id, document: target.document, config: target.config, source: "restore", summary: `Restored “${target.summary || "earlier version"}”`, prompt: `Restore version ${target.id}` });
  return result.ok ? NextResponse.json({ revision: result.revision }) : NextResponse.json({ error: result.error }, { status: result.error === "version_conflict" ? 409 : 422 });
}
