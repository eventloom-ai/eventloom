import { NextRequest, NextResponse } from "next/server";
import { defaultEventConfig, generatePageArtifact } from "@/lib/ai/generator";
import { validateGeneratedArtifact } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const config = defaultEventConfig(message);
  const artifact = await generatePageArtifact(config, message);
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
