import { NextRequest, NextResponse } from "next/server";
import { generateSitePlan } from "@/lib/agent/generate-config";
import { generateArtifactForConfig, saveEventVersion, savePageArtifact } from "@/lib/agent/tools";
import { demoEvent } from "@/lib/sample-data";
import { serviceSupabase } from "@/lib/supabase/server";
import type { EventConfig } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const client = serviceSupabase();
  const body = (await req.json().catch(() => ({}))) as { prompt?: string };

  if (!client) {
    const plan = await generateSitePlan(body.prompt ?? demoEvent.config.title);
    const artifact = await generateArtifactForConfig(plan.config, body.prompt ?? demoEvent.config.title);
    return NextResponse.json({ event_id: eventId, config: plan.config, artifact });
  }

  const { data: event } = await client.from("events").select("config").eq("id", eventId).maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = event.config as EventConfig;
  const prompt = body.prompt?.trim() || existing.title;
  const plan = body.prompt?.trim() ? await generateSitePlan(prompt) : { config: existing, template: existing.template ?? "custom" };
  const config = plan.config;
  const artifact = await generateArtifactForConfig(config, prompt);

  const { error: updateError } = await client
    .from("events")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (updateError) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  await saveEventVersion(eventId, prompt, config);
  const artifactId = await savePageArtifact(eventId, artifact, "draft");

  if (!artifactId) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, config, artifact });
}
