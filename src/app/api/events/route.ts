import { NextRequest, NextResponse } from "next/server";
import { parseBuildForm } from "@/lib/agent/parse-build-form";
import { startBuildJob } from "@/lib/agent/start-build";
import { getServerUser } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await req.formData() : null;
  const body = form
    ? Object.fromEntries(form.entries())
    : contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());

  const parsed = await parseBuildForm(form, body);
  const ownerId = (await getServerUser())?.id ?? null;
  const result = await startBuildJob(parsed, ownerId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.eventId) {
    return NextResponse.redirect(new URL(`/app/events/${result.eventId}`, req.url), { status: 303 });
  }

  return NextResponse.redirect(new URL("/app/events/new", req.url), { status: 303 });
}
