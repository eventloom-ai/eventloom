import { NextRequest, NextResponse } from "next/server";
import { generatePageArtifact } from "@/lib/ai/generator";
import { demoEvent } from "@/lib/sample-data";
import { serviceSupabase } from "@/lib/supabase/server";
import type { EventConfig } from "@/lib/types";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const client = serviceSupabase();

  if (!client) {
    return NextResponse.json({ event_id: eventId, artifact: await generatePageArtifact(demoEvent.config, demoEvent.config.title) });
  }

  const { data: event } = await client.from("events").select("config").eq("id", eventId).maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const config = event.config as EventConfig;
  const artifact = await generatePageArtifact(config, config.title);
  const { error } = await client.from("page_artifacts").insert({
    event_id: eventId,
    status: "draft",
    html: artifact.html,
    css: artifact.css,
    model: artifact.model,
    generated_at: artifact.generatedAt,
  });

  if (error) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, artifact });
}
