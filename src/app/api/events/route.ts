import { NextRequest, NextResponse } from "next/server";
import { buildCompleteSite } from "@/lib/agent/harness";
import { enrichPromptWithTheme, parseBuildForm } from "@/lib/agent/parse-build-form";
import { getServerUser } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await req.formData() : null;
  const body = form
    ? Object.fromEntries(form.entries())
    : contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());

  const parsed = await parseBuildForm(form, body);

  if (!parsed.slug || !parsed.prompt.trim()) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await buildCompleteSite({
    prompt: enrichPromptWithTheme(parsed.prompt, parsed.themeOverrides),
    slug: parsed.slug,
    images: parsed.images,
    templateHint: parsed.templateHint,
    themeOverrides: parsed.themeOverrides,
    ownerId: (await getServerUser())?.id ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, runtime: result.runtime }, { status: 500 });
  }

  if (result.mode === "demo") {
    return NextResponse.redirect(new URL("/app", req.url), { status: 303 });
  }

  return NextResponse.redirect(new URL(`/app/events/${result.event.id}`, req.url), { status: 303 });
}
