import { NextRequest, NextResponse } from "next/server";
import { applyEventDetailsPatch, applySiteOperations } from "@/lib/site-document-operations";
import { canEditEvent, commitStudioRevision, loadStudioState } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getServerUser();
  if (!(await canEditEvent(eventId, user?.id ?? null))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const state = await loadStudioState(eventId, user?.id ?? null);
  return state ? NextResponse.json(state) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 256_000)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const { eventId } = await params;
  const user = await getServerUser();
  if (!(await canEditEvent(eventId, user?.id ?? null))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { baseVersionId?: string; operations?: unknown; eventPatch?: unknown; summary?: string } | null;
  if (!body?.baseVersionId || (!body.operations && !body.eventPatch)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const state = await loadStudioState(eventId, user?.id ?? null);
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (state.revision.id !== body.baseVersionId) return NextResponse.json({ error: "version_conflict", state }, { status: 409 });
  try {
    const applied = body.operations ? applySiteOperations(state.revision.document, body.operations) : { document: state.revision.document, changedNodeIds: [] };
    const config = body.eventPatch ? applyEventDetailsPatch(state.revision.config, body.eventPatch) : state.revision.config;
    const result = await commitStudioRevision({
      eventId,
      ownerId: user?.id ?? null,
      baseVersionId: body.baseVersionId,
      document: applied.document,
      config,
      source: "manual",
      summary: body.summary?.slice(0, 240) || "Edited in the visual studio",
      prompt: "Manual edit",
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "version_conflict" ? 409 : 422 });
    return NextResponse.json({ revision: result.revision, changedNodeIds: applied.changedNodeIds });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_edit" }, { status: 422 });
  }
}
