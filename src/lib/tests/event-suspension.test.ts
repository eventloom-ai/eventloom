import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { composeSiteDocument } from "@/lib/site-document";
import { createFakeSupabase, type FakeSupabase } from "@/lib/tests/fake-supabase";

const mocks = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase,
  failColumn: null as string | null,
  lookupError: false,
  auth: null as null | { user: { id: string }; emailVerified: boolean; aal: string; nextAal: string },
  admins: new Set<string>(),
  audits: [] as Array<Record<string, unknown>>,
}));

// Wraps the fake so tests can simulate a database without the suspension columns (42703) or a failing lookup.
function client() {
  return {
    ...mocks.fake.client,
    from: (table: string) => {
      const builder = mocks.fake.client.from(table);
      const select = builder.select;
      builder.select = ((columns?: string, options?: { count?: string; head?: boolean }) => {
        if ((mocks.failColumn && columns?.includes(mocks.failColumn)) || mocks.lookupError) {
          const failing = { ...builder, maybeSingle: async () => ({ data: null, error: mocks.lookupError ? { code: "57014", message: "timeout" } : { code: "42703", message: "column does not exist" } }) };
          for (const method of ["eq", "not", "in", "abortSignal"] as const) failing[method] = (() => failing) as never;
          return failing;
        }
        return select(columns, options);
      }) as typeof builder.select;
      return builder;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => client(), createSupabaseServerClient: async () => null }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => client() }));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  rootDomain: () => "eventloom.co",
  isSupabaseConfigured: () => true,
  publicRsvpEnabled: () => true,
}));
vi.mock("@/lib/security/rsvp-token", () => ({ verifyPublicRsvpToken: () => ({ eventId: EVENT_ID, slug: "maya-adam" }), createPublicRsvpToken: () => "token" }));
vi.mock("@/lib/security/turnstile", () => ({ verifyTurnstile: async () => true }));
vi.mock("@/lib/security/auth", () => ({ getAuthContext: async () => mocks.auth, hasRequiredMfa: (auth: { aal: string }) => auth.aal === "aal2" }));
vi.mock("@/lib/platform-admin", () => ({ isPlatformAdmin: async (id: string) => mocks.admins.has(id) }));
vi.mock("@/lib/security/audit", () => ({ recordAuditEvent: async (input: Record<string, unknown>) => { mocks.audits.push(input); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST as adminAction } from "@/app/api/admin/reports/route";
import { POST as submitRsvp } from "@/app/api/rsvp/route";
import { clearSuspensionCache, suspendedEventResponse, suspensionTarget } from "@/lib/safety/suspension-gate";
import { resolveEventByHost, resolveEventBySlug } from "@/lib/tenancy";

const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const VERSION_ID = "33333333-3333-4333-8333-333333333333";
const REPORT_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const sample = DESIGN_SAMPLES[0]!;
const document = composeSiteDocument(sample.config, "", (prefix) => `${prefix}_node`);

function seed(suspended = false) {
  mocks.fake = createFakeSupabase({
    events: [{ id: EVENT_ID, owner_id: "owner-1", slug: "maya-adam", status: "published", rsvp_open: true, rsvp_deadline_at: null, config: sample.config, draft_version_id: VERSION_ID, published_version_id: VERSION_ID, suspended_at: suspended ? "2026-10-09T00:00:00.000Z" : null, suspension_reason: suspended ? "phishing" : null }],
    event_entitlements: [{ event_id: EVENT_ID, status: "active", expires_at: "2099-01-01T00:00:00.000Z" }],
    event_versions: [{ id: VERSION_ID, event_id: EVENT_ID, config: sample.config, document }],
    domains: [{ event_id: EVENT_ID, domain: "mayaandadam.com", order_id: "order-1", status: "ready" }],
    abuse_reports: [{ id: REPORT_ID, event_id: EVENT_ID, slug: "maya-adam", reason: "phishing", details: "", status: "new" }],
  });
  mocks.fake.onRpc("submit_public_rsvp", () => ({ data: "submission-1", error: null }));
}

const rsvpBody = { form_token: "x".repeat(40), turnstile_token: "t", idempotency_key: "66666666-6666-4666-8666-666666666666", first_name: "Ana", last_name: "Lee", is_attending: true, party_size: 1 };
const rsvpRequest = () => new NextRequest("https://maya-adam.eventloom.co/api/rsvp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(rsvpBody) });

function adminRequest(body: Record<string, string>, { form = false, origin = "https://eventloom.co" } = {}) {
  return new NextRequest("https://eventloom.co/api/admin/reports", {
    method: "POST",
    headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json", host: "eventloom.co", origin },
    body: form ? new URLSearchParams(body).toString() : JSON.stringify(body),
  });
}

beforeEach(() => {
  seed();
  mocks.failColumn = null;
  mocks.lookupError = false;
  mocks.auth = null;
  mocks.admins = new Set([ADMIN_ID]);
  mocks.audits = [];
  clearSuspensionCache();
});

describe("a suspended event's page is unavailable", () => {
  it("resolves for guests while not suspended, on the slug and on its custom domain", async () => {
    expect((await resolveEventBySlug("maya-adam"))?.id).toBe(EVENT_ID);
    expect((await resolveEventByHost("mayaandadam.com"))?.id).toBe(EVENT_ID);
  });

  it("returns nothing once suspended, so the page 404s with no metadata or share card", async () => {
    seed(true);
    await expect(resolveEventBySlug("maya-adam")).resolves.toBeNull();
    await expect(resolveEventByHost("maya-adam.eventloom.co")).resolves.toBeNull();
    await expect(resolveEventByHost("mayaandadam.com")).resolves.toBeNull();
  });

  it("keeps serving pages on a database without the suspension migration", async () => {
    mocks.failColumn = "suspended_at";
    expect((await resolveEventBySlug("maya-adam"))?.id).toBe(EVENT_ID);
  });

  it("answers 410 with a neutral page on every host, including share images", async () => {
    seed(true);
    for (const [tenant, path] of [[null, "/maya-adam"], [null, "/maya-adam/opengraph-image/v1-abc"], ["maya-adam", "/"], ["mayaandadam.com", "/"], [null, "/sites/mayaandadam.com/opengraph-image/x"]] as const) {
      const response = await suspendedEventResponse(tenant, path);
      expect(response?.status, `${tenant} ${path}`).toBe(410);
      const html = await response!.text();
      expect(html).toContain("This page is unavailable");
      expect(html).not.toMatch(/maya|adam|suspend|phishing|og:/i);
      expect(response!.headers.get("x-robots-tag")).toContain("noindex");
    }
  });

  it("lets everything else through, and fails open when the lookup errors", async () => {
    expect(await suspendedEventResponse(null, "/maya-adam")).toBeNull();
    seed(true);
    mocks.lookupError = true;
    expect(await suspendedEventResponse(null, "/maya-adam")).toBeNull();
  });

  it("only looks up event-shaped paths", () => {
    expect(suspensionTarget(null, "/")).toBeNull();
    expect(suspensionTarget(null, "/templates")).toBeNull();
    expect(suspensionTarget(null, "/report")).toBeNull();
    expect(suspensionTarget(null, "/guides/best-rsvp-website-builders")).toBeNull();
    expect(suspensionTarget(null, "/maya-adam")).toEqual({ kind: "slug", value: "maya-adam" });
    expect(suspensionTarget("www", "/")).toBeNull();
    expect(suspensionTarget("mayaandadam.com", "/anything")).toEqual({ kind: "domain", value: "mayaandadam.com" });
  });

  it("rejects RSVPs to a suspended event before the database is called", async () => {
    expect((await submitRsvp(rsvpRequest())).status).toBe(200);
    expect(mocks.fake.rpcCalls).toHaveLength(1);
    seed(true);
    const response = await submitRsvp(rsvpRequest());
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "unavailable" });
    expect(mocks.fake.rpcCalls).toHaveLength(0);
  });
});

describe("admin takedown actions", () => {
  const adminAuth = { user: { id: ADMIN_ID }, emailVerified: true, aal: "aal2", nextAal: "aal2" };

  it("are hidden (404) from signed-out users, non-admins, admins without MFA, and cross-site posts", async () => {
    const body = { action: "suspend", eventId: EVENT_ID, reason: "phishing" };
    mocks.auth = null;
    expect((await adminAction(adminRequest(body))).status).toBe(404);
    mocks.auth = { ...adminAuth, user: { id: "owner-1" } };
    expect((await adminAction(adminRequest(body))).status).toBe(404);
    mocks.auth = { ...adminAuth, aal: "aal1" };
    expect((await adminAction(adminRequest(body))).status).toBe(404);
    mocks.auth = { ...adminAuth, emailVerified: false };
    expect((await adminAction(adminRequest(body))).status).toBe(404);
    mocks.auth = adminAuth;
    expect((await adminAction(adminRequest(body, { origin: "https://evil.example" }))).status).toBe(404);
    expect(mocks.fake.table("events")[0]?.suspended_at).toBeNull();
    expect(mocks.audits).toEqual([]);
  });

  it("suspend an event from a report, close its reports, audit it, and take the page down", async () => {
    mocks.auth = adminAuth;
    const response = await adminAction(adminRequest({ action: "suspend", eventId: EVENT_ID, reportId: REPORT_ID, reason: "phishing" }, { form: true }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://eventloom.co/admin?moderation=suspend#reports");
    expect(mocks.fake.table("events")[0]).toMatchObject({ suspended_at: expect.any(String), suspension_reason: "phishing", status: "published" });
    expect(mocks.fake.table("abuse_reports")[0]).toMatchObject({ status: "actioned", resolved_by: ADMIN_ID });
    expect(mocks.audits).toEqual([expect.objectContaining({ action: "event.suspended", actorUserId: ADMIN_ID, actorType: "admin", eventId: EVENT_ID, metadata: { reason: "phishing", report_id: REPORT_ID } })]);
    await expect(resolveEventBySlug("maya-adam")).resolves.toBeNull();
    expect((await suspendedEventResponse(null, "/maya-adam"))?.status).toBe(410);
  });

  it("suspend by address, and lift a suspension back to the event as it was", async () => {
    mocks.auth = adminAuth;
    expect((await adminAction(adminRequest({ action: "suspend", slug: "maya-adam", reason: "impersonation" }))).status).toBe(200);
    expect(mocks.fake.table("events")[0]?.suspension_reason).toBe("impersonation");
    expect((await adminAction(adminRequest({ action: "unsuspend", eventId: EVENT_ID }))).status).toBe(200);
    expect(mocks.fake.table("events")[0]).toMatchObject({ suspended_at: null, suspension_reason: null, status: "published", rsvp_open: true });
    expect((await resolveEventBySlug("maya-adam"))?.id).toBe(EVENT_ID);
    expect(mocks.audits.map((audit) => audit.action)).toEqual(["event.suspended", "event.unsuspended"]);
  });

  it("dismiss and mark reports as reviewing, with an audit entry each", async () => {
    mocks.auth = adminAuth;
    expect((await adminAction(adminRequest({ action: "reviewing", reportId: REPORT_ID }))).status).toBe(200);
    expect(mocks.fake.table("abuse_reports")[0]?.status).toBe("reviewing");
    expect((await adminAction(adminRequest({ action: "dismiss", reportId: REPORT_ID }))).status).toBe(200);
    expect(mocks.fake.table("abuse_reports")[0]).toMatchObject({ status: "dismissed", resolved_by: ADMIN_ID });
    expect(mocks.audits.map((audit) => audit.action)).toEqual(["abuse_report.reviewing", "abuse_report.dismissed"]);
    expect(mocks.fake.table("events")[0]?.suspended_at).toBeNull();
  });

  it("reject malformed actions", async () => {
    mocks.auth = adminAuth;
    expect((await adminAction(adminRequest({ action: "suspend", eventId: EVENT_ID, reason: "because" }))).status).toBe(400);
    expect((await adminAction(adminRequest({ action: "suspend", reason: "phishing" }))).status).toBe(400);
    expect((await adminAction(adminRequest({ action: "delete", eventId: EVENT_ID }))).status).toBe(400);
  });
});
