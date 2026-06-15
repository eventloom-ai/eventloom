import { NextRequest, NextResponse } from "next/server";
import type { ImageInput } from "@/lib/ai/generator";
import { buildCompleteSite } from "@/lib/agent/harness";
import { slugSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await req.formData() : null;
  const body = form
    ? Object.fromEntries(form.entries())
    : contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());
  const images = form ? await readImages(form) : [];

  const slug = slugSchema.safeParse(body.slug);
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const templateHint = body.template === "wedding" ? ("wedding" as const) : undefined;

  if (!slug.success || !prompt.trim()) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await buildCompleteSite({
    prompt,
    slug: slug.data,
    images,
    templateHint,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, runtime: result.runtime }, { status: 500 });
  }

  if (result.mode === "demo") {
    return NextResponse.redirect(new URL("/app", req.url), { status: 303 });
  }

  return NextResponse.redirect(new URL(`/app/events/${result.event.id}`, req.url), { status: 303 });
}

async function readImages(form: FormData): Promise<ImageInput[]> {
  return Promise.all(
    form
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.type.startsWith("image/"))
      .slice(0, 4)
      .map(async (file) => ({
        name: file.name,
        mediaType: file.type,
        dataUrl: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`,
      })),
  );
}
