import { NextRequest, NextResponse } from "next/server";
import { generateSitePlan } from "@/lib/agent/generate-config";
import { generateArtifactForConfig, saveEventVersion, savePageArtifact } from "@/lib/agent/tools";
import { serviceSupabase } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/server";
import { isEventOwner, reserveBuildCredit } from "@/lib/payments/billing";
import type { EventConfig } from "@/lib/types";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 8_192)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const { eventId } = await params;
  const client = serviceSupabase();
  const body = (await req.json().catch(() => ({}))) as { prompt?: string };

  const user = await getServerUser();
  if (!client || !user || !(await isEventOwner(eventId, user.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const credit = await reserveBuildCredit(user.id, eventId);
  if (!credit.ok) return NextResponse.json({ error: credit.error }, { status: 402 });

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
