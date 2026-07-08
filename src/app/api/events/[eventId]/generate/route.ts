import { NextRequest, NextResponse } from "next/server";
import { generateSitePlan } from "@/lib/agent/generate-config";
import { generateArtifactForConfig, saveEventVersion, savePageArtifact } from "@/lib/agent/tools";
import { canManageEvent } from "@/lib/organizations";
import { demoEvent } from "@/lib/sample-data";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
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

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: event } = await client.from("events").select("owner_id, organization_id, config").eq("id", eventId).maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const canManage = await canManageEvent({
    userId: user.id,
    ownerId: event.owner_id,
    organizationId: event.organization_id,
  });
  if (!canManage) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = event.config as EventConfig;
  const userPrompt = body.prompt?.trim();
  const prompt = userPrompt
    ? [
        "Update this existing Eventloom site. Keep all existing details unless the user explicitly asks to change them.",
        `Existing site config: ${JSON.stringify(existing)}`,
        `User change request: ${userPrompt}`,
      ].join("\n\n")
    : existing.title;
  const plan = userPrompt ? await generateSitePlan(prompt) : { config: existing, template: existing.template ?? "custom" };
  const config = plan.config;
  const artifact = await generateArtifactForConfig(config, prompt);

  const { error: updateError } = await client
    .from("events")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (updateError) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  await saveEventVersion(eventId, prompt, config, user.id);
  await client.from("page_artifacts").update({ status: "rejected" }).eq("event_id", eventId).eq("status", "draft");
  const artifactId = await savePageArtifact(eventId, artifact, "draft", user.id);

  if (!artifactId) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, config, artifact });
}
