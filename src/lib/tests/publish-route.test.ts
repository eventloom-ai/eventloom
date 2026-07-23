import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as { id: string; email?: string | null } | null,
  canEdit: true,
  platformAdmin: false,
  event: null as unknown,
  entitlement: null as unknown,
  publishError: null as unknown,
  entitlementError: null as unknown,
  publishedUpdate: null as unknown,
  entitlementUpsert: null as unknown,
  checkout: vi.fn(),
  client: null as unknown,
  legalOnboarding: true,
}));

vi.mock("@/lib/payments/stripe", () => ({
  createLaunchCheckoutSession: mocks.checkout,
}));

vi.mock("@/lib/platform-admin", () => ({
  isPlatformAdmin: () => mocks.platformAdmin,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => mocks.client,
  serviceSupabase: () => mocks.client,
}));
vi.mock("@/lib/security/auth", () => ({
  getAuthContext: () => mocks.user ? { user: mocks.user, emailVerified: true, aal: "aal2", nextAal: "aal2" } : null,
  hasRequiredMfa: () => true,
}));
vi.mock("@/lib/security/creator-legal", () => ({ hasCreatorLegalOnboarding: () => mocks.legalOnboarding }));
vi.mock("@/lib/privacy/event-privacy", () => ({ hasCompleteEventPrivacyNotice: () => true }));
vi.mock("@/lib/env", () => ({ legalIdentityConfigured: () => true, publicCheckoutEnabled: () => true, env: { ipHashSecret: () => "" } }));

vi.mock("@/lib/studio-store", () => ({
  canEditEvent: () => mocks.canEdit,
}));

import { POST } from "@/app/api/events/[eventId]/publish/route";

const eventId = "10000000-0000-4000-8000-000000000001";
const versionId = "10000000-0000-4000-8000-000000000003";

function createClient() {
  return {
    from: vi.fn((table: string) => {
      let operation = "select";
      const builder = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), update: vi.fn(), upsert: vi.fn() };
      builder.select.mockReturnValue(builder);
      builder.eq.mockImplementation(() => operation === "update"
        ? Promise.resolve({ error: mocks.publishError })
        : builder);
      builder.maybeSingle.mockResolvedValue({
        data: table === "events" ? mocks.event : mocks.entitlement,
        error: null,
      });
      builder.update.mockImplementation((value) => {
        operation = "update";
        mocks.publishedUpdate = value;
        return builder;
      });
      builder.upsert.mockImplementation((value) => {
        mocks.entitlementUpsert = value;
        return Promise.resolve({ error: mocks.entitlementError });
      });
      return builder;
    }),
  };
}

function request(body: object = {}) {
  return new Request(`https://eventloom-beta.vercel.app/api/events/${eventId}/publish`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: "https://eventloom-beta.vercel.app", host: "eventloom-beta.vercel.app" },
    body: JSON.stringify(body),
  });
}

function invoke(body?: object) {
  return POST(request(body) as never, { params: Promise.resolve({ eventId }) });
}

describe("event publishing payment gate", () => {
  beforeEach(() => {
    mocks.user = { id: "10000000-0000-4000-8000-000000000010", email: "owner@example.com" };
    mocks.canEdit = true;
    mocks.platformAdmin = false;
    mocks.event = { draft_version_id: versionId, ends_at: "2099-01-01T00:00:00.000Z" };
    mocks.entitlement = null;
    mocks.publishError = null;
    mocks.entitlementError = null;
    mocks.publishedUpdate = null;
    mocks.entitlementUpsert = null;
    mocks.client = createClient();
    mocks.legalOnboarding = true;
    mocks.checkout.mockReset().mockResolvedValue({ ok: true, url: "https://checkout.stripe.test/cs_launch_1" });
  });

  it("publishes the current draft immediately for an active entitlement", async () => {
    mocks.entitlement = { status: "active", expires_at: "2099-01-01T00:00:00.000Z" };

    const response = await invoke();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, published: true, free: false });
    expect(mocks.publishedUpdate).toMatchObject({ status: "published", rsvp_open: true, published_version_id: versionId });
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("sends an expired entitlement through checkout instead of publishing", async () => {
    mocks.entitlement = { status: "active", expires_at: "2020-01-01T00:00:00.000Z" };

    const response = await invoke({ legalAccepted: true, legalVersion: "2026-07-22-beta" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, checkout_url: "https://checkout.stripe.test/cs_launch_1" });
    expect(mocks.checkout).toHaveBeenCalledWith({
      eventId,
      ownerId: mocks.user?.id,
      customerEmail: "owner@example.com",
      domain: undefined,
      registrant: undefined,
      acceptance: { version: "2026-07-22-beta", ipHash: null, userAgentClass: "unknown" },
    });
    expect(mocks.publishedUpdate).toBeNull();
  });

  it("allows a platform administrator to publish without checkout", async () => {
    mocks.platformAdmin = true;

    const response = await invoke();

    await expect(response.json()).resolves.toEqual({ ok: true, published: true, free: true });
    expect(mocks.entitlementUpsert).toMatchObject({
      event_id: eventId,
      owner_id: mocks.user?.id,
      status: "active",
    });
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("does not publish when the administrator entitlement cannot be granted", async () => {
    mocks.platformAdmin = true;
    mocks.entitlementError = { code: "database_error" };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await invoke();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "publish_failed" });
    expect(mocks.publishedUpdate).toBeNull();
    consoleError.mockRestore();
  });

  it("returns a retryable server error when publishing the entitled draft fails", async () => {
    mocks.entitlement = { status: "active", expires_at: "2099-01-01T00:00:00.000Z" };
    mocks.publishError = { code: "database_error" };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await invoke();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "publish_failed" });
    consoleError.mockRestore();
  });

  it("rejects unauthenticated publishing before checkout", async () => {
    mocks.user = null;

    const response = await invoke();

    expect(response.status).toBe(401);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("requires durable creator legal onboarding before publishing", async () => {
    mocks.legalOnboarding = false;
    const response = await invoke();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "legal_onboarding_required" });
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
});
