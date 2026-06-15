import { NextRequest, NextResponse } from "next/server";
import { defaultEventConfig, generatePageArtifact } from "@/lib/ai/generator";
import { validateGeneratedArtifact } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const body = contentType.includes("multipart/form-data") ? await readMultipart(req) : await readJson(req);
  const message = body.message.trim();
  if (!message) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const config = defaultEventConfig(message);
  const artifact = await generatePageArtifact(config, message, body.images);
  const validation = validateGeneratedArtifact(artifact);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  return NextResponse.json({
    config,
    artifact: validation.artifact,
    next: "preview",
  });
}

async function readJson(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { message?: string } | null;
  return { message: body?.message ?? "", images: [] };
}

async function readMultipart(req: NextRequest) {
  const form = await req.formData();
  const images = await Promise.all(
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

  return { message: String(form.get("message") ?? form.get("prompt") ?? ""), images };
}
