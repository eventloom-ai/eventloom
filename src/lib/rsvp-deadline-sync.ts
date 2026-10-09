import "server-only";

import { rsvpDeadlineTimestamp } from "@/lib/rsvp-deadline";
import { serviceSupabase } from "@/lib/supabase/server";
import type { EventConfig } from "@/lib/types";

/**
 * Keeps events.rsvp_deadline_at in step with the deadline guests can read: the published version's while the event
 * is live (draft edits apply when they are published), the draft's before that. Runs with the service role after
 * saves, publishes and timezone changes. Best effort: a failure here never fails the save that triggered it.
 */
export async function syncEventRsvpDeadline(eventId: string) {
  const client = serviceSupabase();
  if (!client) return null;
  try {
    const { data: event, error } = await client.from("events").select("status, config, published_version_id, timezone, event_timezone, rsvp_deadline_at").eq("id", eventId).maybeSingle();
    if (error || !event) return null;
    let config = event.config as EventConfig | null;
    if (event.status === "published" && event.published_version_id) {
      const { data: version } = await client.from("event_versions").select("config").eq("id", event.published_version_id).eq("event_id", eventId).maybeSingle();
      if (version?.config) config = version.config as EventConfig;
    }
    const deadlineAt = rsvpDeadlineTimestamp(config?.rsvpDeadline, { timeZone: event.event_timezone || event.timezone, eventDate: config?.date });
    const current = event.rsvp_deadline_at ? new Date(event.rsvp_deadline_at as string).toISOString() : null;
    if (current === deadlineAt) return deadlineAt;
    const { error: updateError } = await client.from("events").update({ rsvp_deadline_at: deadlineAt }).eq("id", eventId);
    if (updateError) console.error("[rsvp-deadline] failed to update", { eventId, code: updateError.code });
    return deadlineAt;
  } catch (error) {
    console.error("[rsvp-deadline] sync failed", { eventId, message: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}
