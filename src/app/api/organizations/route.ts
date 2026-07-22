import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/security/auth";
import { recordAuditEvent } from "@/lib/security/audit";
import { isSameOriginMutation, readJsonWithinLimit, requestWithinLimit } from "@/lib/security/request";
import { serviceSupabase } from "@/lib/supabase/server";

const organizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(63),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request) || !requestWithinLimit(request, 4_096)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const auth = await getAuthContext();
  if (!auth?.emailVerified) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsedBody = await readJsonWithinLimit(request, 4_096);
  if (!parsedBody.ok) return NextResponse.json({ error: "invalid_request" }, { status: parsedBody.error === "payload_too_large" ? 413 : 400 });
  const parsed = organizationSchema.safeParse(parsedBody.data);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data, error } = await client.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_actor: auth.user.id,
  });
  if (error || !data) return NextResponse.json({ error: error?.code === "23505" ? "slug_taken" : "creation_failed" }, { status: error?.code === "23505" ? 409 : 500 });
  await recordAuditEvent({ action: "organization.created", actorUserId: auth.user.id, actorType: "user", targetType: "organization", targetId: data });
  return NextResponse.json({ id: data }, { status: 201 });
}
