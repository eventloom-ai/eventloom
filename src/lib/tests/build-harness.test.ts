import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuildProgressEvent } from "@/lib/agent/progress";
import type { EventRecord } from "@/lib/types";

const mocks = vi.hoisted(() => ({ persist: false, seedInitialRevision: vi.fn(), generatePageArtifact: vi.fn() }));

vi.mock("@/lib/ai/generator", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/ai/generator")>()), generatePageArtifact: mocks.generatePageArtifact }));
vi.mock("@/lib/studio-store", () => ({ seedInitialRevision: mocks.seedInitialRevision }));
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
    savePageArtifact: vi.fn(),
    uploadEventImages: vi.fn(async () => []),
    updateEventConfig: vi.fn(async () => true),
    updateGenerationJobProgress: vi.fn(),
    finishGenerationJob: vi.fn(),
  };
});

const { buildCompleteSite } = await import("@/lib/agent/harness");
const { getLocalDemoEventBySlug } = await import("@/lib/local-demo-store");
const tools = await import("@/lib/agent/tools");

const prompt = "Garden supper for Lena. The event is on Saturday, November 21, 2026 at 7:30 PM. It will be held at Rose Court.";

async function build(input: { placeholderEventId?: string }) {
  const progress: BuildProgressEvent[] = [];
  const result = await buildCompleteSite({ jobId: "job-1", prompt, slug: "garden-supper", ...input, onProgress: (event) => { progress.push(event); } });
  return { result, percents: progress.map((event) => event.progressPercent) };
}

describe("site build harness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never generates an HTML artifact and saves a renderable document in demo mode", async () => {
    mocks.persist = false;
    const { result, percents } = await build({});

    expect(result.ok).toBe(true);
    expect(mocks.generatePageArtifact).not.toHaveBeenCalled();
    expect(percents.at(-1)).toBe(100);
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
    const saved = getLocalDemoEventBySlug("garden-supper");
    expect(saved?.document?.nodes.length).toBeGreaterThan(0);
    expect(saved?.config.schedule[0]?.time).toBe("7:30 PM");
  });

  it("seeds the first site document for a new event instead of saving a page artifact", async () => {
    mocks.persist = true;
    const { result, percents } = await build({ placeholderEventId: "11111111-1111-4111-8111-111111111111" });

    expect(result.ok).toBe(true);
    expect(mocks.generatePageArtifact).not.toHaveBeenCalled();
    expect(tools.savePageArtifact).not.toHaveBeenCalled();
    expect(mocks.seedInitialRevision).toHaveBeenCalledWith(expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111" }), null, expect.objectContaining({ prompt, document: expect.objectContaining({ schemaVersion: 2 }) }));
    expect(percents.at(-1)).toBe(100);
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
  });
});
