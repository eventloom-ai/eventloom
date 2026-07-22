import { NextRequest, NextResponse } from "next/server";
import { generateInvitationImage } from "@/lib/ai/invitation-image";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export async function POST(req: NextRequest) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 8_192)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (!(await getServerUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const names = typeof body.names === "string" ? body.names : undefined;
  const style = typeof body.style === "string" ? body.style : undefined;

  const result = await generateInvitationImage({ names, style });
  return NextResponse.json(result);
}
