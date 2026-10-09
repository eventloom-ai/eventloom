import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  jobId: "job-1" as string | null,
  credit: { ok: true, remainingCents: 450 } as { ok: true; remainingCents: number } | { ok: false; error: string },
  createEvent: vi.fn(),
  finishJob: vi.fn(),
  updateJob: vi.fn(),
  refund: vi.fn(async () => true),
  build: vi.fn(),
  runId: "run-1" as string | null,
  original: vi.fn(),
  updateRun: vi.fn(),
  seed: vi.fn(async () => ({ id: "version-1" })),
}));

vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: vi.fn() }));
vi.mock("@/lib/agent/harness", () => ({ buildCompleteSite: mocks.build }));
vi.mock("@/lib/agent/tools", () => ({
  createEventRecord: mocks.createEvent,
  createGenerationJob: vi.fn(async () => { mocks.calls.push("job"); return mocks.jobId; }),
  finishGenerationJob: mocks.finishJob,
  updateGenerationJobProgress: mocks.updateJob,
  placeholderEventConfig: vi.fn(() => ({ title: "Placeholder" })),
}));
vi.mock("@/lib/payments/billing", () => ({
  isEventOwner: vi.fn(async () => true),
  reserveBuildCredit: vi.fn(async () => { mocks.calls.push("reserve"); return mocks.credit; }),
  refundBuildCredit: mocks.refund,
}));
vi.mock("@/lib/studio-store", () => ({
  reapStaleGenerationJobs: vi.fn(),
  createStudioRun: vi.fn(async () => { mocks.calls.push("run"); return mocks.runId; }),
  updateStudioRun: mocks.updateRun,
  seedInitialRevision: mocks.seed,
  createBuilderMessage: vi.fn(),
}));
vi.mock("@/lib/agent/generate-document", () => ({ generateOriginalSite: mocks.original }));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => null, getServerUser: async () => ({ id: "owner-1" }) }));

import { startBuildJob } from "@/lib/agent/start-build";
import { POST as createStudio } from "@/app/api/events/studio/route";

const parsed = { prompt: "Garden supper for Lena", slug: "garden-supper", images: [] };
const event = { id: "event-1", slug: "garden-supper", status: "draft", rsvp_open: false, config: { title: "Garden supper" } };

function studioRequest(prompt = "Garden supper for Lena on Saturday") {
  const form = new FormData();
  form.set("prompt", prompt);
  form.set("slug", "garden-supper");
  return new NextRequest("https://eventloom.test/api/events/studio", { method: "POST", headers: { origin: "https://eventloom.test", host: "eventloom.test" }, body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls = [];
  mocks.jobId = "job-1";
  mocks.runId = "run-1";
  mocks.credit = { ok: true, remainingCents: 450 };
  mocks.createEvent.mockResolvedValue({ event });
});

describe("startBuildJob credit", () => {
  it("reserves credit only after the job exists, then attaches the placeholder event", async () => {
    await expect(startBuildJob(parsed, "owner-1")).resolves.toEqual({ ok: true, jobId: "job-1", eventId: "event-1", slug: "garden-supper" });
    expect(mocks.calls).toEqual(["job", "reserve"]);
    expect(mocks.updateJob).toHaveBeenCalledWith("job-1", expect.objectContaining({ eventId: "event-1" }), "owner-1");
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it("rejects an over-long prompt before creating a job or charging", async () => {
    await expect(startBuildJob({ ...parsed, promptTooLong: true }, "owner-1")).resolves.toEqual({ ok: false, error: "prompt_too_long", status: 400 });
    expect(mocks.calls).toEqual([]);
  });

  it("charges nothing when the job cannot be created", async () => {
    mocks.jobId = null;
    await expect(startBuildJob(parsed, "owner-1")).resolves.toMatchObject({ ok: false, error: "job_create_failed" });
    expect(mocks.calls).toEqual(["job"]);
  });

  it("fails the job without creating an event when credit is used up", async () => {
    mocks.credit = { ok: false, error: "ai_credit_limit_reached" };
    await expect(startBuildJob(parsed, "owner-1")).resolves.toMatchObject({ ok: false, error: "ai_credit_limit_reached", status: 402 });
    expect(mocks.finishJob).toHaveBeenCalledWith("job-1", "failed", "ai_credit_limit_reached", "owner-1");
    expect(mocks.createEvent).not.toHaveBeenCalled();
  });

  it("refunds the reserved credit when the placeholder event cannot be created", async () => {
    mocks.createEvent.mockResolvedValue({ event: null, error: "duplicate key value" });
    await expect(startBuildJob(parsed, "owner-1")).resolves.toMatchObject({ ok: false, error: "slug_taken", status: 409 });
    expect(mocks.finishJob).toHaveBeenCalledWith("job-1", "failed", "slug_taken", "owner-1");
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", null, "job-1");
  });
});

describe("studio workspace credit", () => {
  it("charges against a run and keeps the credit when the AI site is delivered", async () => {
    mocks.original.mockResolvedValue({ document: {}, config: event.config, message: "Done", summary: "First", generated: true });
    const response = await createStudio(studioRequest());
    expect(response.status).toBe(201);
    expect(mocks.calls).toEqual(["run", "reserve"]);
    expect(mocks.refund).not.toHaveBeenCalled();
    expect(mocks.updateRun).toHaveBeenCalledWith("run-1", expect.objectContaining({ status: "succeeded" }));
  });

  it("refunds when generation throws or falls back, and still seeds a workspace", async () => {
    mocks.original.mockRejectedValueOnce(new Error("boom"));
    expect((await createStudio(studioRequest())).status).toBe(201);
    mocks.original.mockResolvedValueOnce({ document: {}, config: event.config, message: "Fallback", summary: "First", generated: false });
    expect((await createStudio(studioRequest())).status).toBe(201);
    expect(mocks.refund).toHaveBeenNthCalledWith(1, "owner-1", "event-1", "run-1");
    expect(mocks.refund).toHaveBeenNthCalledWith(2, "owner-1", "event-1", "run-1");
    expect(mocks.seed).toHaveBeenCalledTimes(2);
    expect(mocks.updateRun).toHaveBeenCalledWith("run-1", expect.objectContaining({ status: "failed" }));
  });

  it("refunds a delivered site that could not be saved", async () => {
    mocks.original.mockResolvedValue({ document: {}, config: event.config, message: "Done", summary: "First", generated: true });
    mocks.seed.mockRejectedValueOnce(new Error("db down"));
    const response = await createStudio(studioRequest());
    expect(response.status).toBe(500);
    expect(mocks.refund).toHaveBeenCalledWith("owner-1", "event-1", "run-1");
  });

  it("rejects an over-long prompt before creating the event", async () => {
    const response = await createStudio(studioRequest("a".repeat(4_001)));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "prompt_too_long" });
    expect(mocks.createEvent).not.toHaveBeenCalled();
  });

  it("never charges without a run to refund against", async () => {
    mocks.runId = null;
    expect((await createStudio(studioRequest())).status).toBe(201);
    expect(mocks.calls).toEqual(["run"]);
    expect(mocks.original).not.toHaveBeenCalled();
  });
});
