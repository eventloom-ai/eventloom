import { NextRequest, NextResponse } from "next/server";
import type { ImageInput } from "@/lib/ai/generator";
import { defaultEventConfig, generatePageArtifact } from "@/lib/ai/generator";
import { serviceSupabase } from "@/lib/supabase/server";
import { slugSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await req.formData() : null;
  const body = form ? Object.fromEntries(form.entries()) : contentType.includes("application/json") ? await req.json() : Object.fromEntries((await req.formData()).entries());
  const images = form ? await readImages(form) : [];

  const slug = slugSchema.safeParse(body.slug);
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!slug.success || !prompt.trim()) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const config = defaultEventConfig(prompt);
  const artifact = await generatePageArtifact(config, prompt, images);
  const client = serviceSupabase();

  if (!client) {
    return NextResponse.redirect(new URL("/app", req.url), { status: 303 });
  }

  const { data: event, error } = await client
    .from("events")
    .insert({ slug: slug.data, status: "draft", rsvp_open: false, config })
    .select("id")
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  await client.from("page_artifacts").insert({
    event_id: event.id,
    status: "draft",
    html: artifact.html,
    css: artifact.css,
    model: artifact.model,
    generated_at: artifact.generatedAt,
  });

  return NextResponse.redirect(new URL(`/app/events/${event.id}`, req.url), { status: 303 });
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
