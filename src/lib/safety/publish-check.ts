import "server-only";

import { reportOperationalEvent } from "@/lib/monitoring";
import { guestFacingContent } from "@/lib/safety/guest-content";
import { isBlocked, moderateText } from "@/lib/safety/moderation";
import { detectPhishingSignals } from "@/lib/safety/phishing";
import { recordAuditEvent } from "@/lib/security/audit";
import { siteDocumentSchema } from "@/lib/site-document";
import { serviceSupabase } from "@/lib/supabase/server";
import type { EventConfig } from "@/lib/types";

export type PublishSafetyResult =
  | { ok: true }
  | { ok: false; error: "event_suspended" | "content_needs_review" | "content_not_allowed"; status: number };

type EventSafetyRow = { slug: string; draft_version_id: string | null; suspended_at?: string | null };

/**
 * Runs before an event goes live (direct publish, admin publish, and before checkout, whose webhook later publishes
 * the same draft version): suspended events stay down, phishing-like pages are held for review, and the final guest
 * text goes through moderation. Moderation fails open; the phishing rules are local and always run.
 */
export async function checkPublishSafety(eventId: string): Promise<PublishSafetyResult> {
  const client = serviceSupabase();
  if (!client) return { ok: true };

  const event = await loadEventSafetyRow(client, eventId);
  if (!event) return { ok: true };
  if (event.suspended_at) return { ok: false, error: "event_suspended", status: 403 };
  if (!event.draft_version_id) return { ok: true };

  const { data: version } = await client
    .from("event_versions")
    .select("config, document")
    .eq("id", event.draft_version_id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!version) return { ok: true };

  const document = siteDocumentSchema.safeParse(version.document);
  const content = guestFacingContent(version.config as EventConfig, document.success ? document.data : null);

  const signals = detectPhishingSignals({ ...content, slug: event.slug });
  if (signals.length) {
    reportOperationalEvent("warn", "publish_held_for_review", { eventId, signals: signals.join(",") });
    await recordAuditEvent({ action: "safety.publish_held", actorType: "system", eventId, targetType: "event", targetId: eventId, metadata: { signals: signals.join(",") } });
    return { ok: false, error: "content_needs_review", status: 422 };
  }

  const verdict = await moderateText(content.texts, { surface: "publish", eventId });
  if (isBlocked(verdict)) {
    await recordAuditEvent({ action: "safety.publish_blocked", actorType: "system", eventId, targetType: "event", targetId: eventId, metadata: { categories: verdict.categories.join(",") } });
    return { ok: false, error: "content_not_allowed", status: 422 };
  }
  return { ok: true };
}

type ServiceClient = NonNullable<ReturnType<typeof serviceSupabase>>;

// Tolerates a database where the suspension migration has not been applied yet (42703 = undefined column).
async function loadEventSafetyRow(client: ServiceClient, eventId: string): Promise<EventSafetyRow | null> {
  const withSuspension = await client.from("events").select("slug, draft_version_id, suspended_at").eq("id", eventId).maybeSingle();
  if (withSuspension.error?.code === "42703") {
    const legacy = await client.from("events").select("slug, draft_version_id").eq("id", eventId).maybeSingle();
    return (legacy.data as EventSafetyRow | null) ?? null;
  }
  return (withSuspension.data as EventSafetyRow | null) ?? null;
}
