import { NextRequest, NextResponse } from "next/server";
import { generateSitePlan } from "@/lib/agent/generate-config";
import { generateArtifactForConfig } from "@/lib/agent/tools";
import { validateGeneratedArtifact } from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/env";
import { reserveBuildCredit } from "@/lib/payments/billing";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 21 * 1024 * 1024)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const user = await getServerUser();
  if (!user || !isSupabaseConfigured()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const contentType = req.headers.get("content-type") ?? "";
  const body = contentType.includes("multipart/form-data") ? await readMultipart(req) : await readJson(req);
  const message = body.message.trim();
  if (!message || message.length > 4_000) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const credit = await reserveBuildCredit(user.id);
  if (!credit.ok) return NextResponse.json({ error: credit.error }, { status: 402 });

  const plan = await generateSitePlan(message);
  const artifact = await generateArtifactForConfig(plan.config, message, body.images);

  const validation = validateGeneratedArtifact(artifact);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  return NextResponse.json({
    config: plan.config,
    template: plan.template,
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
  const files = form
    .getAll("images")
    .filter((file): file is File => file instanceof File && ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024)
    .slice(0, 4);
  const images = await Promise.all(
    files.map(async (file) => {
      const input = Buffer.from(await file.arrayBuffer());
      const image = sharp(input, { failOn: "warning", limitInputPixels: 25_000_000 });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw new Error("invalid_image");
      const safe = await image.rotate().webp({ quality: 85 }).toBuffer();
      return {
        name: file.name,
        mediaType: "image/webp",
        dataUrl: `data:image/webp;base64,${safe.toString("base64")}`,
      };
    }),
  );

  return { message: String(form.get("message") ?? form.get("prompt") ?? ""), images };
}
