import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoEvents } from "@/lib/sample-data";
import { saveLocalDemoEvent } from "@/lib/local-demo-store";

type Call = { table: string; method: string; args: unknown[] };

const mocks = vi.hoisted(() => ({
  client: null as null | { from: (table: string) => unknown },
  refund: vi.fn(async () => true),
}));

vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => mocks.client }));
vi.mock("@/lib/payments/billing", () => ({ refundBuildCredit: mocks.refund }));

import { appendRunEvent, commitStudioRevision, composeSeedDocument, loadStudioState, reapStaleGenerationJobs, seedInitialRevision } from "@/lib/studio-store";

// A minimal PostgREST-style builder: every call is recorded and `resolve` decides what the awaited query returns.
function fakeClient(resolve: (table: string, calls: Call[]) => unknown) {
  const log: Call[] = [];
  return {
    log,
    from(table: string) {
      const calls: Call[] = [];
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "insert", "update", "eq", "lt", "order", "limit"]) {
        builder[method] = (...args: unknown[]) => { const call = { table, method, args }; calls.push(call); log.push(call); return builder; };
      }
      builder.maybeSingle = () => Promise.resolve(resolve(table, calls));
      builder.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise.resolve(resolve(table, calls)).then(onFulfilled, onRejected);
      return builder;
    },
  };
}

const photo = "data:image/png;base64,iVBORw0KGgo=";

describe("studio seeding with inline reference photos", () => {
  beforeEach(() => { mocks.client = null; });

  it("drops data: image URLs instead of failing the document", () => {
    const config = { ...demoEvents[0].config, heroImageUrl: photo, galleryImageUrls: [photo, "https://cdn.example.com/a.jpg"] };
    const seeded = composeSeedDocument(config, "Garden party");
    expect(seeded.config.heroImageUrl).toBeUndefined();
    expect(seeded.config.galleryImageUrls).toEqual(["https://cdn.example.com/a.jpg"]);
    expect(JSON.stringify(seeded.document)).not.toContain("data:");
  });

  it("keeps stored asset URLs", () => {
    const seeded = composeSeedDocument({ ...demoEvents[0].config, heroImageUrl: "/api/assets/00000000-0000-4000-8000-0000000000aa" }, "Garden party");
    expect(seeded.config.heroImageUrl).toBe("/api/assets/00000000-0000-4000-8000-0000000000aa");
    expect(JSON.stringify(seeded.document)).toContain("/api/assets/00000000-0000-4000-8000-0000000000aa");
  });

  it("seeds an initial revision for a build that carried a data: hero image", async () => {
    const revision = await seedInitialRevision({ ...demoEvents[0], id: "demo-photo-build", config: { ...demoEvents[0].config, heroImageUrl: photo } }, null);
    expect(revision.config.heroImageUrl).toBeUndefined();
  });
});

describe("demo-mode studio state", () => {
  beforeEach(() => { mocks.client = null; });

  it("loads the locally built event and keeps revision ids consistent across autosaves", async () => {
    const local = { ...demoEvents[0], id: "demo-garden-supper", slug: "garden-supper", config: { ...demoEvents[0].config, title: "Garden Supper" } };
    saveLocalDemoEvent(local);
    const initial = await loadStudioState(local.id, null);
    expect(initial?.event.config.title).toBe("Garden Supper");
    expect(initial?.revision.id).toBe(`demo-version-${local.id}`);

    const first = await commitStudioRevision({ eventId: local.id, ownerId: null, baseVersionId: initial!.revision.id, document: initial!.revision.document, config: initial!.revision.config, source: "manual", summary: "Edit", prompt: "Manual edit" });
    expect(first.ok).toBe(true);
    const afterFirst = await loadStudioState(local.id, null);
    expect(first.ok && afterFirst?.revision.id).toBe(first.ok && first.revision.id);
    expect(afterFirst?.versions).toHaveLength(1);
  });
});

describe("appendRunEvent", () => {
  it("retries with the next sequence when a concurrent insert takes the same one", async () => {
    let latest = 3;
    const inserted: number[] = [];
    const client = fakeClient((table, calls) => {
      const insert = calls.find((call) => call.method === "insert");
      if (!insert) return { data: { sequence: latest } };
      const sequence = (insert.args[0] as { sequence: number }).sequence;
      inserted.push(sequence);
      if (inserted.length === 1) { latest = sequence; return { error: { code: "23505" } }; }
      return { error: null };
    });
    mocks.client = client;
    await expect(appendRunEvent("job-1", "event-1", "cancelled", { message: "Stopped" })).resolves.toBe(true);
    expect(inserted).toEqual([4, 5]);
  });
});

describe("reapStaleGenerationJobs", () => {
  beforeEach(() => mocks.refund.mockClear());

  it("fails running jobs older than ten minutes, notifies the studio, and refunds the credit", async () => {
    const client = fakeClient((table, calls) => {
      if (table === "generation_jobs") return { data: [{ id: "job-1", event_id: "event-1", owner_id: "owner-1" }, { id: "job-2", event_id: null, owner_id: "owner-1" }], error: null };
      return calls.some((call) => call.method === "insert") ? { error: null } : { data: null };
    });
    mocks.client = client;
    await expect(reapStaleGenerationJobs({ eventId: "event-1" })).resolves.toBe(2);
    const filters = client.log.filter((call) => call.table === "generation_jobs");
    expect(filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: "update", args: [expect.objectContaining({ status: "failed", error: "job_timed_out" })] }),
      expect.objectContaining({ method: "eq", args: ["status", "running"] }),
      expect.objectContaining({ method: "eq", args: ["event_id", "event-1"] }),
      expect.objectContaining({ method: "lt", args: ["created_at", expect.any(String)] }),
    ]));
    const cutoff = filters.find((call) => call.method === "lt")!.args[1] as string;
    expect(Date.now() - new Date(cutoff).getTime()).toBeGreaterThanOrEqual(10 * 60 * 1000 - 1000);
    expect(client.log).toContainEqual(expect.objectContaining({ table: "generation_job_events", method: "insert", args: [expect.objectContaining({ job_id: "job-1", type: "error" })] }));
    expect(mocks.refund).toHaveBeenCalledTimes(1);
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", "event-1", "job-1");
  });
});
