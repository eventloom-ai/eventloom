import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { composeSiteDocument } from "@/lib/site-document";
import { demoEvents } from "@/lib/sample-data";

const mocks = vi.hoisted(() => ({
  key: "sk-test",
  cancelAfterProvider: false,
  cancelBeforeProvider: false,
  providerCalls: 0,
  events: [] as Array<{ type: string; payload: Record<string, unknown> }>,
  refund: vi.fn(async () => true),
  commit: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  AI_REQUEST_TIMEOUT_MS: 240_000,
  env: { openaiApiKey: () => mocks.key },
  openaiResponsesOptions: () => ({ model: "test" }),
}));
vi.mock("@/lib/payments/billing", () => ({ refundBuildCredit: mocks.refund }));
vi.mock("@/lib/agent/generate-document", () => ({ generateOriginalSite: vi.fn() }));
vi.mock("@/lib/studio-store", () => {
  const config = demoEvents[0].config;
  const document = composeSiteDocument(config, "", (prefix) => `${prefix}_node`);
  return {
    loadStudioState: async () => ({ revision: { id: "version-1", config, document }, messages: [] }),
    getStudioRun: async () => ({ kind: "edit", cancel_requested: mocks.providerCalls ? mocks.cancelAfterProvider : mocks.cancelBeforeProvider }),
    appendRunEvent: async (_jobId: string, _eventId: string, type: string, payload: Record<string, unknown>) => { mocks.events.push({ type, payload }); return true; },
    commitStudioRevision: mocks.commit,
    createBuilderMessage: async () => null,
    updateStudioRun: async () => undefined,
  };
});

import { executeStudioRun } from "@/lib/studio-agent";

const originalFetch = global.fetch;
const run = () => executeStudioRun({ jobId: "job-1", eventId: "event-1", ownerId: "owner-1", prompt: "Use warmer colors", selectedNodeIds: [] });

describe("executeStudioRun credit and cancellation", () => {
  afterAll(() => { global.fetch = originalFetch; });
  beforeEach(() => {
    mocks.key = "sk-test";
    mocks.cancelAfterProvider = false;
    mocks.cancelBeforeProvider = false;
    mocks.providerCalls = 0;
    mocks.events = [];
    mocks.refund.mockClear();
    mocks.commit.mockReset();
    global.fetch = vi.fn(async () => {
      mocks.providerCalls += 1;
      return { ok: false, json: async () => null };
    }) as unknown as typeof fetch;
  });

  it("keeps the credit and never streams the patch when cancelled after the provider call", async () => {
    mocks.cancelAfterProvider = true;
    await run();
    expect(mocks.providerCalls).toBe(1);
    expect(mocks.events.map((event) => event.type)).not.toContain("patch");
    expect(mocks.events.at(-1)?.type).toBe("cancelled");
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it("refunds when the run is cancelled before the provider is called", async () => {
    mocks.cancelBeforeProvider = true;
    await run();
    expect(mocks.providerCalls).toBe(0);
    expect(mocks.events.at(-1)?.type).toBe("cancelled");
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", "event-1", "job-1");
  });

  it("keeps the credit when the edit fails after the provider call", async () => {
    mocks.commit.mockResolvedValue({ ok: false, error: "version_conflict" });
    await run();
    expect(mocks.providerCalls).toBe(1);
    expect(mocks.events.at(-1)).toEqual({ type: "error", payload: { message: "version_conflict" } });
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it("passes a timeout signal to the provider request", async () => {
    mocks.commit.mockResolvedValue({ ok: true, revision: { id: "version-2" } });
    await run();
    expect(vi.mocked(global.fetch).mock.calls[0]?.[1]).toMatchObject({ signal: expect.any(AbortSignal) });
  });
});
