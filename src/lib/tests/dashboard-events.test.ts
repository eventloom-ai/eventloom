import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { listCreatorEvents } from "@/lib/dashboard-events";

function creatorEventsClient() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: [], error: null });

  const from = vi.fn().mockReturnValue(query);
  const client = { from } as unknown as SupabaseClient;

  return { client, from, query };
}

describe("creator event dashboard", () => {
  it("always scopes published sites to the signed-in creator", async () => {
    const { client, from, query } = creatorEventsClient();

    await listCreatorEvents(client, "creator-a", "published");

    expect(from).toHaveBeenCalledWith("events");
    expect(query.eq).toHaveBeenNthCalledWith(1, "owner_id", "creator-a");
    expect(query.eq).toHaveBeenNthCalledWith(2, "status", "published");
  });

  it("also scopes the all-events view to the signed-in creator", async () => {
    const { client, query } = creatorEventsClient();

    await listCreatorEvents(client, "creator-b", "all");

    expect(query.eq).toHaveBeenCalledOnce();
    expect(query.eq).toHaveBeenCalledWith("owner_id", "creator-b");
  });
});
