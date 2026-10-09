import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { SECTION_KEYS, type EventDesign } from "@/lib/event-design/schema";
import { composeSiteDocument } from "@/lib/site-document";
import { createFakeSupabase, type FakeSupabase } from "@/lib/tests/fake-supabase";

/**
 * The studio assistant on a designed event, end to end through the route: signed-in request → run + credit
 * reservation → after() worker → OpenAI (mocked) → design patch → committed version. Supabase is an in-memory fake
 * so the real studio-store code runs; only auth, OpenAI and Next's after() are stubbed.
 */

const mocks = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase,
  user: { id: "owner-1" } as { id: string } | null,
  key: "sk-test",
  after: [] as Array<() => Promise<unknown>>,
}));

vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: (task: () => Promise<unknown>) => { mocks.after.push(task); } }));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => mocks.fake.client, getServerUser: async () => mocks.user, createSupabaseServerClient: async () => null }));
// Limits have their own tests (rate-limit.test.ts); here every request is within them.
vi.mock("@/lib/security/rate-limit", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/security/rate-limit")>()), enforceRateLimit: async () => null }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, openaiResponsesOptions: () => ({ model: "test-model" }), env: { ...actual.env, openaiApiKey: () => mocks.key } };
});

import { POST } from "@/app/api/events/[eventId]/studio/messages/route";

const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
const design: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "blush", content: wedding.content };
const config = { ...wedding.config, design };
const document = composeSiteDocument(config, "", (prefix) => `${prefix}_node`);
const unchangedVariants = Object.fromEntries(SECTION_KEYS.map((key) => [key, null]));
const modelEdit = {
  message: "Switched to Luxe Noir and retitled the RSVP.",
  summary: "Switched style",
  eventPatch: { title: null, subtitle: null, date: null, venueName: null, venueAddress: null, rsvpDeadline: "August 15, 2026", schedule: null, rsvpFields: null },
  design: {
    styleKey: "noir", paletteKey: null,
    content: { eyebrow: null, detailsHeading: null, scheduleHeading: null, galleryHeading: null, goodToKnowHeading: null, rsvpHeading: "Kindly reply", rsvpDescription: null, closingLine: null, dressCode: null, story: null, goodToKnow: null, travel: null },
    clearContent: [], hide: [], show: [], order: null, variants: unchangedVariants,
  },
};

const openAiOk = () => vi.fn(async () => ({ ok: true, json: async () => ({ id: "resp-1", output_text: JSON.stringify(modelEdit) }) }));

function post(body: Record<string, unknown> = {}) {
  return POST(
    new NextRequest("https://eventloom.test/api/events/event-1/studio/messages", {
      method: "POST",
      headers: { origin: "https://eventloom.test", host: "eventloom.test", "content-type": "application/json" },
      body: JSON.stringify({ message: "Switch to the noir style, call the RSVP Kindly reply, and move the deadline to August 15", baseVersionId: "version-1", selectedNodeIds: ["section-rsvp"], ...body }),
    }),
    { params: Promise.resolve({ eventId: "event-1" }) },
  );
}

async function runWorkers() {
  const tasks = mocks.after.splice(0);
  for (const task of tasks) await task();
}

const rows = (table: string) => mocks.fake.table(table);
const job = () => rows("generation_jobs")[0];
const eventRow = () => rows("events")[0];
const runEventTypes = () => rows("generation_job_events").sort((a, b) => Number(a.sequence) - Number(b.sequence)).map((row) => row.type);
const refunds = () => mocks.fake.rpcCalls.filter((call) => call.name === "refund_ai_build_credit");

describe("studio assistant route on a designed event (signed in)", () => {
  beforeEach(() => {
    mocks.user = { id: "owner-1" };
    mocks.key = "sk-test";
    mocks.after = [];
    mocks.fake = createFakeSupabase({
      events: [{ id: "event-1", owner_id: "owner-1", slug: "amina-kareem", status: "draft", rsvp_open: false, config, draft_version_id: "version-1", published_version_id: null, timezone: "America/Toronto", event_timezone: "America/New_York", rsvp_deadline_at: null }],
      event_versions: [{ id: "version-1", event_id: "event-1", parent_version_id: null, source: "initial", summary: "First version", prompt: "Amina and Kareem's wedding", config, document, created_at: "2026-01-01T00:00:00.000Z" }],
    });
    mocks.fake.onRpc("reserve_ai_build_credit", () => ({ data: 450, error: null }));
    mocks.fake.onRpc("refund_ai_build_credit", () => ({ data: true, error: null }));
    global.fetch = openAiOk() as unknown as typeof fetch;
  });

  it("reserves credit, applies the model's design patch, commits a new version and keeps the credit", async () => {
    const response = await post();
    expect(response.status).toBe(202);
    const body = await response.json() as { runId: string; remainingCreditCents: number; message: { role: string } };
    expect(body).toMatchObject({ runId: job().id, remainingCreditCents: 450, message: { role: "user" } });
    expect(job()).toMatchObject({ status: "running", kind: "edit", base_version_id: "version-1", owner_id: "owner-1", selected_node_ids: ["section-rsvp"] });
    expect(mocks.fake.rpcCalls).toEqual([{ name: "reserve_ai_build_credit", args: expect.objectContaining({ p_user_id: "owner-1", p_event_id: "event-1" }) }]);

    await runWorkers();

    // The design edit went to OpenAI with the selected section, using the design schema.
    const request = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
    expect(request.text.format.name).toBe("eventloom_design_edit");
    expect(JSON.parse(request.input[1].content).selectedSections).toEqual(["rsvp"]);

    // A new AI version on top of the base, now the draft.
    const committed = rows("event_versions").find((row) => row.id !== "version-1")!;
    expect(committed).toMatchObject({ event_id: "event-1", parent_version_id: "version-1", source: "ai", summary: "Switched style" });
    expect(committed.config).toMatchObject({ title: wedding.config.title, rsvpDeadline: "August 15, 2026", design: { styleKey: "noir", paletteKey: "gilded", content: { rsvpHeading: "Kindly reply" } } });
    expect(committed.document).toEqual(document);
    expect(eventRow()).toMatchObject({ draft_version_id: committed.id, config: committed.config });
    // The new deadline closes at the end of August 15 in the event's timezone (EDT, UTC−4).
    expect(eventRow().rsvp_deadline_at).toBe("2026-08-16T03:59:59.999Z");

    expect(job()).toMatchObject({ status: "succeeded", result_version_id: committed.id, response_id: "resp-1" });
    expect(runEventTypes()).toEqual(["status", "status", "patch", "status", "committed"]);
    const patch = rows("generation_job_events").find((row) => row.type === "patch")!;
    expect((patch.payload as { changedNodeIds: string[] }).changedNodeIds).toEqual(["section-rsvp"]);
    expect(rows("builder_messages").map((row) => row.role)).toEqual(["user", "assistant"]);
    expect(refunds()).toEqual([]);
  });

  // One credit rule (src/lib/payments/ai-credit-rule.ts): a fallback-only result never consumes the credit.
  it("refunds the credit when the provider fails and only the fallback edit is committed", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => null })) as unknown as typeof fetch;
    await post({ message: "Use the sage palette" });
    await runWorkers();
    const committed = rows("event_versions").find((row) => row.id !== "version-1")!;
    expect(committed.config).toMatchObject({ design: { styleKey: "romantic", paletteKey: "sage" } });
    expect(job()).toMatchObject({ status: "succeeded" });
    expect(refunds()).toEqual([{ name: "refund_ai_build_credit", args: expect.objectContaining({ p_user_id: "owner-1", p_job_id: job().id }) }]);
  });

  it("refunds the credit when the run is stopped before the provider is called", async () => {
    await post();
    job().cancel_requested = true;
    await runWorkers();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(rows("event_versions")).toHaveLength(1);
    expect(job()).toMatchObject({ status: "failed", error: "run_cancelled" });
    expect(runEventTypes().at(-1)).toBe("cancelled");
    expect(refunds()).toEqual([{ name: "refund_ai_build_credit", args: expect.objectContaining({ p_user_id: "owner-1", p_event_id: "event-1", p_job_id: job().id }) }]);
  });

  it("keeps the credit when the run is stopped after the provider answered, without saving the edit", async () => {
    global.fetch = vi.fn(async () => {
      job().cancel_requested = true;
      return { ok: true, json: async () => ({ id: "resp-1", output_text: JSON.stringify(modelEdit) }) };
    }) as unknown as typeof fetch;
    await post();
    await runWorkers();
    expect(rows("event_versions")).toHaveLength(1);
    expect(eventRow().draft_version_id).toBe("version-1");
    expect(job()).toMatchObject({ status: "failed", error: "run_cancelled" });
    expect(runEventTypes()).not.toContain("patch");
    expect(refunds()).toEqual([]);
  });

  it("refunds when no provider is configured and the commit fails", async () => {
    mocks.key = "";
    await post({ message: "Use the sage palette" });
    // Another tab saved a newer draft while the run was working.
    const tasks = mocks.after.splice(0);
    eventRow().draft_version_id = "version-elsewhere";
    for (const task of tasks) await task();
    expect(rows("event_versions")).toHaveLength(1);
    expect(job()).toMatchObject({ status: "failed" });
    expect(refunds()).toHaveLength(1);
  });

  it("does not start a run without credit, and fails the run it opened", async () => {
    mocks.fake.onRpc("reserve_ai_build_credit", () => ({ data: null, error: { message: "limit" } }));
    const response = await post();
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ error: "ai_credit_limit_reached" });
    expect(job()).toMatchObject({ status: "failed", error: "ai_credit_limit_reached" });
    expect(mocks.after).toHaveLength(0);
  });

  it("rejects signed-out requests, other people's events and stale drafts without reserving credit", async () => {
    mocks.user = null;
    expect((await post()).status).toBe(404);
    mocks.user = { id: "someone-else" };
    expect((await post()).status).toBe(404);
    mocks.user = { id: "owner-1" };
    const stale = await post({ baseVersionId: "version-0" });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: "version_conflict", state: { revision: { id: "version-1" } } });
    expect(mocks.fake.rpcCalls).toEqual([]);
    expect(rows("generation_jobs")).toEqual([]);
  });
});
