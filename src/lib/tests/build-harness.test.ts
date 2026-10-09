import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuildProgressEvent } from "@/lib/agent/progress";
import type { EventRecord } from "@/lib/types";

const mocks = vi.hoisted(() => ({ persist: false, planGenerated: null as boolean | null, seedInitialRevision: vi.fn(), refund: vi.fn(async () => true) }));

vi.mock("@/lib/payments/billing", () => ({ refundBuildCredit: mocks.refund }));

vi.mock("@/lib/studio-store", () => ({ seedInitialRevision: mocks.seedInitialRevision }));
// Tests run without a provider key, so the planner falls back; planGenerated simulates a successful provider plan.
vi.mock("@/lib/agent/generate-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agent/generate-config")>();
  return {
    ...actual,
    generateSitePlan: vi.fn(async (...args: Parameters<typeof actual.generateSitePlan>) => {
      const plan = await actual.generateSitePlan(...args);
      return mocks.planGenerated === null ? plan : { ...plan, generated: mocks.planGenerated };
    }),
  };
});
vi.mock("@/lib/agent/runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agent/runtime")>();
  return { ...actual, getAgentRuntime: () => { const runtime = actual.getAgentRuntime(); return { ...runtime, capabilities: { ...runtime.capabilities, persist_events: mocks.persist } }; } };
});
vi.mock("@/lib/agent/tools", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agent/tools")>();
  const saved: EventRecord = { id: "11111111-1111-4111-8111-111111111111", slug: "garden-supper", status: "draft", rsvp_open: false, config: actual.placeholderEventConfig("garden-supper") };
  return {
    ...actual,
    updateEventRecord: vi.fn(async ({ config }) => ({ event: { ...saved, config } })),
    saveEventVersion: vi.fn(),
    uploadEventImages: vi.fn(async () => []),
    updateEventConfig: vi.fn(async () => true),
    updateGenerationJobProgress: vi.fn(),
    finishGenerationJob: vi.fn(),
    discardPlaceholderEvent: vi.fn(async () => true),
  };
});

const { buildCompleteSite } = await import("@/lib/agent/harness");
const { getLocalDemoEventBySlug } = await import("@/lib/local-demo-store");
const { readEventDesign } = await import("@/lib/event-design/schema");
const tools = await import("@/lib/agent/tools");

const prompt = "Garden supper for Lena. The event is on Saturday, November 21, 2026 at 7:30 PM. It will be held at Rose Court.";

async function build(input: { placeholderEventId?: string; ownerId?: string }) {
  const progress: BuildProgressEvent[] = [];
  const result = await buildCompleteSite({ jobId: "job-1", prompt, slug: "garden-supper", ...input, onProgress: (event) => { progress.push(event); } });
  return { result, percents: progress.map((event) => event.progressPercent) };
}

describe("site build harness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.planGenerated = null;
  });

  it("never generates an HTML artifact and saves a renderable document in demo mode", async () => {
    mocks.persist = false;
    const { result, percents } = await build({});

    expect(result.ok).toBe(true);
    expect(percents.at(-1)).toBe(100);
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
    const saved = getLocalDemoEventBySlug("garden-supper");
    expect(saved?.document?.nodes.length).toBeGreaterThan(0);
    expect(saved?.config.schedule[0]?.time).toBe("7:30 PM");
    // New events carry a design (deterministic without a provider); the document stays as the legacy fallback.
    expect(readEventDesign(saved?.config)).toMatchObject({ version: 1, content: {} });
  });

  it("art-directs with the intake mood", async () => {
    mocks.persist = false;
    await buildCompleteSite({ jobId: "job-2", prompt: "Wedding for Lena and Omar at Rose Court.", slug: "lena-omar", themeOverrides: { mood: "navy" } });
    expect(readEventDesign(getLocalDemoEventBySlug("lena-omar")?.config)).toMatchObject({ styleKey: "editorial", paletteKey: "riviera" });
  });

  it("seeds the first site document for a new event instead of saving a page artifact", async () => {
    mocks.persist = true;
    const { result, percents } = await build({ placeholderEventId: "11111111-1111-4111-8111-111111111111" });

    expect(result.ok).toBe(true);
    expect(mocks.seedInitialRevision).toHaveBeenCalledWith(expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111" }), null, expect.objectContaining({ prompt, document: expect.objectContaining({ schemaVersion: 2 }) }));
    expect(percents.at(-1)).toBe(100);
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
  });

  it("fails the job, refunds the credit and removes the empty placeholder when a first build fails", async () => {
    mocks.persist = true;
    vi.mocked(tools.updateEventRecord).mockResolvedValueOnce({ event: null, error: "update_failed" });
    const { result } = await build({ placeholderEventId: "11111111-1111-4111-8111-111111111111", ownerId: "owner-1" });

    expect(result).toMatchObject({ ok: false, error: "update_failed" });
    expect(tools.finishGenerationJob).toHaveBeenCalledWith("job-1", "failed", "update_failed", "owner-1");
    // Recorded without an event id: a ledger row pointing at the placeholder would block deleting it.
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", null, "job-1");
    expect(tools.discardPlaceholderEvent).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "owner-1");
  });

  it("keeps an existing event when its rebuild fails", async () => {
    mocks.persist = true;
    vi.mocked(tools.updateEventRecord).mockResolvedValueOnce({ event: null, error: "update_failed" });
    const getEventRecord = vi.spyOn(tools, "getEventRecord");
    getEventRecord.mockResolvedValueOnce({ id: "22222222-2222-4222-8222-222222222222", slug: "garden-supper", status: "draft", rsvp_open: false, config: tools.placeholderEventConfig("garden-supper") });
    const result = await buildCompleteSite({ jobId: "job-1", prompt, slug: "garden-supper", existingEventId: "22222222-2222-4222-8222-222222222222", ownerId: "owner-1" });

    expect(result.ok).toBe(false);
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", "22222222-2222-4222-8222-222222222222", "job-1");
    expect(tools.discardPlaceholderEvent).not.toHaveBeenCalled();
  });

  it("refunds when the harness throws", async () => {
    mocks.persist = true;
    vi.mocked(tools.uploadEventImages).mockRejectedValueOnce(new Error("storage_down"));
    expect((await build({ placeholderEventId: "11111111-1111-4111-8111-111111111111", ownerId: "owner-1" })).result).toMatchObject({ ok: false, error: "storage_down" });
    expect(mocks.refund).toHaveBeenCalledTimes(1);
  });

  it("keeps the credit for a delivered build with an AI result, and refunds one that fell back entirely", async () => {
    mocks.persist = true;
    mocks.planGenerated = true;
    expect((await build({ placeholderEventId: "11111111-1111-4111-8111-111111111111", ownerId: "owner-1" })).result.ok).toBe(true);
    expect(mocks.refund).not.toHaveBeenCalled();

    // No provider: both the planner and the art director fall back to deterministic output.
    mocks.planGenerated = null;
    expect((await build({ placeholderEventId: "11111111-1111-4111-8111-111111111111", ownerId: "owner-1" })).result.ok).toBe(true);
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", "11111111-1111-4111-8111-111111111111", "job-1");
    expect(tools.discardPlaceholderEvent).not.toHaveBeenCalled();
  });
});
