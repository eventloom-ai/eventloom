import { NextRequest, NextResponse } from "next/server";
import { parseBuildForm } from "@/lib/agent/parse-build-form";
import { startBuildJob } from "@/lib/agent/start-build";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 12 * 1024 * 1024)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await req.formData() : null;
  const body = form
    ? Object.fromEntries(form.entries())
    : contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());

  const parsed = await parseBuildForm(form, body);
  const ownerId = user.id;
  const result = await startBuildJob(parsed, ownerId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.eventId) {
    return NextResponse.redirect(new URL(`/app/events/${result.eventId}`, req.url), { status: 303 });
  }

  return NextResponse.redirect(new URL("/app/events/new", req.url), { status: 303 });
}
