import { NextResponse } from "next/server";
import { getVerifiedAgentRuntime } from "@/lib/agent/runtime";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { isPlatformAdmin } from "@/lib/platform-admin";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth || !hasRequiredMfa(auth) || !(await isPlatformAdmin(auth.user.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const runtime = await getVerifiedAgentRuntime();
  return NextResponse.json(runtime, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
