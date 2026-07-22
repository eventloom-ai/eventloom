import "server-only";

import { serviceSupabase } from "@/lib/supabase/server";

export async function recordAuditEvent(input: {
  action: string;
  actorUserId?: string | null;
  actorType?: "user" | "guest" | "system" | "admin";
  eventId?: string | null;
  targetType?: string;
  targetId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const client = serviceSupabase();
  if (!client) return;
  await client.from("audit_events").insert({
    action: input.action,
    actor_user_id: input.actorUserId ?? null,
    actor_type: input.actorType ?? "system",
    event_id: input.eventId ?? null,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
}
