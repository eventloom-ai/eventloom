import { NextRequest, NextResponse } from "next/server";
import { parseBuildForm } from "@/lib/agent/parse-build-form";
import { startBuildJob } from "@/lib/agent/start-build";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 12 * 1024 * 1024)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await req.formData() : null;
  const body = form
    ? Object.fromEntries(form.entries())
    : contentType.includes("application/json")
      ? await req.json()
      : {};

  const parsed = await parseBuildForm(form, body);
  const ownerId = (await getServerUser())?.id ?? null;
  if (hasSupabasePublicEnv() && !ownerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await startBuildJob(parsed, ownerId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    jobId: result.jobId,
    eventId: result.eventId,
    slug: result.slug,
  });
}
