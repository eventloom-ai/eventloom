import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(async () => ({ data: "org-1", error: null })) }));

vi.mock("@/lib/security/auth", () => ({ getAuthContext: async () => ({ emailVerified: true, user: { id: "user-1" } }) }));
vi.mock("@/lib/security/audit", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => ({ rpc: mocks.rpc }) }));
// Limits have their own tests (rate-limit.test.ts); here every request is within them.
vi.mock("@/lib/security/rate-limit", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/security/rate-limit")>()), enforceRateLimit: async () => null }));

import { POST } from "@/app/api/organizations/route";

const create = (slug: string) => POST(new NextRequest("https://eventloom.test/api/organizations", {
  method: "POST",
  headers: { origin: "https://eventloom.test", host: "eventloom.test", "content-type": "application/json" },
  body: JSON.stringify({ name: "Acme Events", slug }),
}));

describe("organization slugs", () => {
  beforeEach(() => mocks.rpc.mockClear());

  it("rejects reserved slugs with the shared validation", async () => {
    for (const slug of ["admin", "api", "eventloom", "Support"]) {
      const response = await create(slug);
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({ error: "slug_reserved" });
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed slugs and normalizes valid ones", async () => {
    expect((await create("no")).status).toBe(400);
    expect((await create("bad slug")).status).toBe(400);
    expect((await create(" Acme-Events ")).status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith("create_organization", expect.objectContaining({ p_slug: "acme-events" }));
  });
});
