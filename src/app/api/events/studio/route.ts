import { NextRequest, NextResponse } from "next/server";
import { defaultEventConfig } from "@/lib/ai/generator";
import { generateOriginalSite } from "@/lib/agent/generate-document";
import { createEventRecord } from "@/lib/agent/tools";
import { reserveBuildCredit } from "@/lib/payments/billing";
import { normalizeSlugInput, suggestSlug } from "@/lib/slug-suggest";
import { createBuilderMessage, seedInitialRevision } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 16_384)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { prompt?: string; slug?: string } | null;
  const prompt = body?.prompt?.trim() ?? "";
  if (!prompt || prompt.length > 8000) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const baseSlug = normalizeSlugInput(body?.slug || suggestSlug(prompt) || "my-event");
  const slug = baseSlug.length >= 3 ? baseSlug : `event-${Date.now().toString(36)}`;
  const planConfig = defaultEventConfig(prompt);
  const created = await createEventRecord({ slug, config: planConfig, ownerId: user.id });
  if (!created.event) return NextResponse.json({ error: created.error?.includes("duplicate") ? "slug_taken" : created.error ?? "create_event_failed" }, { status: created.error?.includes("duplicate") ? 409 : 500 });
  const credit = await reserveBuildCredit(user.id, created.event.id);
  const original = credit.ok ? await generateOriginalSite(prompt, planConfig) : null;
  const revision = await seedInitialRevision(created.event, user.id, original
    ? { document: original.document, config: original.config, prompt, summary: original.summary }
    : { config: planConfig, prompt, summary: "Created the first original version" });
  await createBuilderMessage({ eventId: created.event.id, role: "user", content: prompt, versionId: revision.id, ownerId: user.id });
  await createBuilderMessage({
    eventId: created.event.id,
    role: "assistant",
    content: original?.message ?? "I created a first version from your description. Tell me what to change.",
    versionId: revision.id,
    ownerId: user.id,
  });
  return NextResponse.json({ eventId: created.event.id, slug, ...(credit.ok ? {} : { warning: credit.error }) }, { status: 201 });
}
