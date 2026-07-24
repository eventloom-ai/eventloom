import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRecord } from "@/lib/types";

export type EventDashboardFilter = "all" | "published";

export async function listCreatorEvents(
  client: SupabaseClient,
  ownerId: string,
  filter: EventDashboardFilter,
): Promise<EventRecord[]> {
  let query = client
    .from("events")
    .select("id, owner_id, slug, status, rsvp_open, config")
    .eq("owner_id", ownerId);

  if (filter === "published") {
    query = query.eq("status", "published");
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return (data ?? []) as EventRecord[];
}
