import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  user: { id: "10000000-0000-4000-8000-000000000010" } as { id: string } | null,
  event: { id: "10000000-0000-4000-8000-000000000001", owner_id: "10000000-0000-4000-8000-000000000010", status: "draft" } as unknown,
  activeDomain: null as unknown,
  assets: [] as Array<{ metadata: Record<string, unknown> }>,
  assetsError: null as unknown,
  deleteError: null as unknown,
  storageError: null as unknown,
  removedPaths: [] as string[],
  audit: vi.fn(),
  client: null as unknown,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerUser: () => mocks.user,
  serviceSupabase: () => mocks.client,
}));
vi.mock("@/lib/security/audit", () => ({ recordAuditEvent: mocks.audit }));

import { DELETE } from "@/app/api/events/[eventId]/route";

const eventId = "10000000-0000-4000-8000-000000000001";

function createClient() {
  return {
    from: vi.fn((table: string) => {
      let deleting = false;
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        in: vi.fn(),
        limit: vi.fn(),
        maybeSingle: vi.fn(),
        delete: vi.fn(),
      };
      builder.select.mockImplementation(() => builder);
      builder.eq.mockImplementation(() => builder);
      builder.in.mockImplementation(() => builder);
      builder.limit.mockImplementation(() => builder);
      builder.delete.mockImplementation(() => {
        deleting = true;
        return builder;
      });
      builder.maybeSingle.mockImplementation(() => {
        if (deleting) return Promise.resolve({ data: mocks.deleteError ? null : { id: eventId }, error: mocks.deleteError });
        if (table === "events") return Promise.resolve({ data: mocks.event, error: null });
        if (table === "domains") return Promise.resolve({ data: mocks.activeDomain, error: null });
        return Promise.resolve({ data: null, error: null });
      });
      if (table === "assets") {
        builder.eq.mockImplementation(() => Promise.resolve({ data: mocks.assets, error: mocks.assetsError }));
      }
      return builder;
    }),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn((paths: string[]) => {
          mocks.removedPaths = paths;
          return Promise.resolve({ error: mocks.storageError });
        }),
      })),
    },
  };
}

function request(origin = "https://eventloom.test") {
  return new NextRequest(`https://eventloom.test/api/events/${eventId}`, {
    method: "DELETE",
    headers: { origin, host: "eventloom.test" },
  });
}

function invoke(origin?: string) {
  return DELETE(request(origin), { params: Promise.resolve({ eventId }) });
}

describe("event deletion", () => {
  beforeEach(() => {
    mocks.user = { id: "10000000-0000-4000-8000-000000000010" };
    mocks.event = { id: eventId, owner_id: mocks.user.id, status: "draft" };
    mocks.activeDomain = null;
    mocks.assets = [];
    mocks.assetsError = null;
    mocks.deleteError = null;
    mocks.storageError = null;
    mocks.removedPaths = [];
    mocks.audit.mockReset().mockResolvedValue(undefined);
    mocks.client = createClient();
  });

  it("deletes an owned event and its private storage assets", async () => {
    mocks.assets = [{ metadata: { bucket: "event-assets-private", path: `${eventId}/hero.webp` } }];

    const response = await invoke();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.removedPaths).toEqual([`${eventId}/hero.webp`]);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "event.deleted", actorUserId: mocks.user?.id, targetId: eventId }));
  });

  it("does not reveal or delete an event the user does not own", async () => {
    mocks.event = null;

    const response = await invoke();

    expect(response.status).toBe(404);
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("blocks deletion while a custom domain still needs transfer or removal", async () => {
    mocks.activeDomain = { id: "domain_1" };

    const response = await invoke();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "active_domain_transfer_required" });
  });

  it("rejects cross-origin deletion", async () => {
    const response = await invoke("https://attacker.test");
    expect(response.status).toBe(403);
  });
});
