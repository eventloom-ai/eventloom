import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: {
    user: { id: "10000000-0000-4000-8000-000000000010" },
    emailVerified: true,
    aal: "aal1",
    nextAal: "aal2",
  } as {
    user: { id: string };
    emailVerified: boolean;
    aal: string;
    nextAal: string;
  } | null,
  updateError: null as null | { code: string },
  updatedName: "",
  audit: vi.fn(),
}));

vi.mock("@/lib/security/auth", () => ({
  getAuthContext: () => mocks.auth,
  hasRequiredMfa: () => false,
}));
vi.mock("@/lib/security/audit", () => ({
  recordAuditEvent: mocks.audit,
}));
vi.mock("@/lib/supabase/server", () => ({
  serviceSupabase: () => ({
    from: () => {
      const builder = {
        update: vi.fn(),
        eq: vi.fn(),
        select: vi.fn(),
        single: vi.fn(),
      };
      builder.update.mockImplementation((value: { full_name: string }) => {
        mocks.updatedName = value.full_name;
        return builder;
      });
      builder.eq.mockReturnValue(builder);
      builder.select.mockReturnValue(builder);
      builder.single.mockImplementation(() => Promise.resolve({
        data: mocks.updateError ? null : { full_name: mocks.updatedName },
        error: mocks.updateError,
      }));
      return builder;
    },
  }),
}));

import { PATCH } from "@/app/api/account/route";

function request(body: unknown, origin = "https://eventloom.test") {
  return new NextRequest("https://eventloom.test/api/account", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      host: "eventloom.test",
      origin,
    },
    body: JSON.stringify(body),
  });
}

describe("profile updates", () => {
  beforeEach(() => {
    mocks.auth = {
      user: { id: "10000000-0000-4000-8000-000000000010" },
      emailVerified: true,
      aal: "aal1",
      nextAal: "aal2",
    };
    mocks.updateError = null;
    mocks.updatedName = "";
    mocks.audit.mockReset();
  });

  it("updates only the authenticated creator profile and records an audit event", async () => {
    const response = await PATCH(request({ fullName: "  Alex Morgan  " }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ fullName: "Alex Morgan" });
    expect(mocks.updatedName).toBe("Alex Morgan");
    expect(mocks.audit).toHaveBeenCalledWith({
      action: "account.profile_updated",
      actorUserId: mocks.auth?.user.id,
      actorType: "user",
    });
  });

  it("rejects invalid names and cross-origin requests", async () => {
    expect((await PATCH(request({ fullName: "A" }))).status).toBe(400);
    expect((await PATCH(request({ fullName: "Alex Morgan" }, "https://attacker.test"))).status).toBe(400);
    expect(mocks.updatedName).toBe("");
  });

  it("requires a signed-in creator with a verified email", async () => {
    mocks.auth = null;
    expect((await PATCH(request({ fullName: "Alex Morgan" }))).status).toBe(401);

    mocks.auth = {
      user: { id: "10000000-0000-4000-8000-000000000010" },
      emailVerified: false,
      aal: "aal1",
      nextAal: "aal1",
    };
    expect((await PATCH(request({ fullName: "Alex Morgan" }))).status).toBe(403);
  });
});
