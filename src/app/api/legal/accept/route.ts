import { NextRequest, NextResponse } from "next/server";
import { LEGAL_VERSION } from "@/lib/legal-documents";
import { getAuthContext } from "@/lib/security/auth";
import { recordAuditEvent } from "@/lib/security/audit";
import { clientIpHash, isSameOriginMutation, readJsonWithinLimit, requestWithinLimit } from "@/lib/security/request";
import { serviceSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request) || !requestWithinLimit(request, 2_000)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const auth = await getAuthContext();
  if (!auth?.emailVerified) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsedBody = await readJsonWithinLimit<{ age18?: unknown; accepted?: unknown; version?: unknown }>(request, 2_000);
  if (!parsedBody.ok) return NextResponse.json({ error: "invalid_request" }, { status: parsedBody.error === "payload_too_large" ? 413 : 400 });
  const body = parsedBody.data;
  if (body?.age18 !== true || body.accepted !== true || body.version !== LEGAL_VERSION) return NextResponse.json({ error: "acceptance_required" }, { status: 400 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: documents } = await client.from("legal_documents").select("id").eq("version", LEGAL_VERSION).eq("status", "active").in("document_key", ["terms", "privacy", "acceptable-use"]);
  if (!documents || documents.length !== 3) return NextResponse.json({ error: "legal_documents_not_ready" }, { status: 503 });
  const agent = (request.headers.get("user-agent") ?? "unknown").slice(0, 160);
  const { error: acceptanceError } = await client.from("legal_acceptances").insert(documents.map((document) => ({ document_id: document.id, user_id: auth.user.id, ip_hash: clientIpHash(request), user_agent_class: agent })));
  if (acceptanceError && acceptanceError.code !== "23505") return NextResponse.json({ error: "acceptance_failed" }, { status: 500 });
  const { error } = await client.from("profiles").update({ age_18_confirmed_at: new Date().toISOString(), legal_version: LEGAL_VERSION }).eq("id", auth.user.id);
  if (error) return NextResponse.json({ error: "acceptance_failed" }, { status: 500 });
  await recordAuditEvent({ action: "legal.onboarding.accepted", actorUserId: auth.user.id, actorType: "user", metadata: { version: LEGAL_VERSION } });
  return NextResponse.json({ ok: true });
}
