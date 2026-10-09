import { NextRequest } from "next/server";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import type { EventDesign } from "@/lib/event-design/schema";
import { composeSiteDocument } from "@/lib/site-document";
import { createFakeSupabase, type FakeSupabase } from "@/lib/tests/fake-supabase";
import type { ModerationVerdict } from "@/lib/safety/moderation";

/**
 * Where moderation and the phishing rules sit in each flow: a refused brief, studio message, photo or page costs no
 * AI credit and creates nothing; publish is held before both the direct publish and checkout.
 */

const mocks = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase,
  textVerdict: { status: "allowed" } as ModerationVerdict,
  imageVerdict: { status: "allowed" } as ModerationVerdict,
  moderatedTexts: [] as string[][],
  audits: [] as Array<Record<string, unknown>>,
  createGenerationJob: vi.fn(async () => "job-1"),
  reserveBuildCredit: vi.fn(async () => ({ ok: true, remainingCents: 0 })),
  createEventRecord: vi.fn(async () => ({ event: null, error: "create_event_failed" })),
  createStudioRun: vi.fn(async () => "run-1"),
}));

vi.mock("@/lib/safety/moderation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/safety/moderation")>()),
  moderateText: async (input: string | string[]) => {
    mocks.moderatedTexts.push(Array.isArray(input) ? input : [input]);
    return mocks.textVerdict;
  },
  moderateImage: async () => mocks.imageVerdict,
}));
vi.mock("@/lib/supabase/server", () => ({
  serviceSupabase: () => mocks.fake.client,
  getServerUser: async () => ({ id: "owner-1" }),
  createSupabaseServerClient: async () => null,
}));
vi.mock("@/lib/security/audit", () => ({ recordAuditEvent: async (input: Record<string, unknown>) => { mocks.audits.push(input); } }));
vi.mock("@/lib/agent/harness", () => ({ buildCompleteSite: vi.fn() }));
vi.mock("@/lib/agent/tools", () => ({ createEventRecord: mocks.createEventRecord, createGenerationJob: mocks.createGenerationJob, finishGenerationJob: vi.fn(), placeholderEventConfig: vi.fn(), updateGenerationJobProgress: vi.fn() }));
vi.mock("@/lib/payments/billing", () => ({ isEventOwner: async () => true, reserveBuildCredit: mocks.reserveBuildCredit, refundBuildCredit: vi.fn() }));
vi.mock("@/lib/studio-store", () => ({
  reapStaleGenerationJobs: vi.fn(),
  canEditEvent: async () => true,
  loadStudioState: async () => ({ revision: { id: "version-1" }, activeRun: null }),
  createStudioRun: mocks.createStudioRun,
  createBuilderMessage: vi.fn(),
  updateStudioRun: vi.fn(),
  seedInitialRevision: vi.fn(),
}));

import { POST as createStudio } from "@/app/api/events/studio/route";
import { POST as sendStudioMessage } from "@/app/api/events/[eventId]/studio/messages/route";
import { startBuildJob } from "@/lib/agent/start-build";
import { processAndStoreEventImage } from "@/lib/event-assets";
import { checkPublishSafety } from "@/lib/safety/publish-check";

const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const VERSION_ID = "33333333-3333-4333-8333-333333333333";
const blocked: ModerationVerdict = { status: "blocked", categories: ["violence/graphic"] };

async function pngDataUrl() {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#b48a5a" } }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function seedVersion(contentPatch: Partial<EventDesign["content"]> = {}, eventPatch: Record<string, unknown> = {}) {
  const sample = DESIGN_SAMPLES[0]!;
  const design: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "blush", content: { ...sample.content, ...contentPatch } };
  const config = { ...sample.config, design };
  mocks.fake = createFakeSupabase({
    events: [{ id: EVENT_ID, slug: "maya-adam", status: "draft", draft_version_id: VERSION_ID, suspended_at: null, ...eventPatch }],
    event_versions: [{ id: VERSION_ID, event_id: EVENT_ID, config, document: composeSiteDocument(config, "", (prefix) => `${prefix}_node`) }],
  });
}

beforeEach(() => {
  mocks.textVerdict = { status: "allowed" };
  mocks.imageVerdict = { status: "allowed" };
  mocks.moderatedTexts = [];
  mocks.audits = [];
  mocks.createGenerationJob.mockClear();
  mocks.reserveBuildCredit.mockClear();
  mocks.createEventRecord.mockClear();
  mocks.createStudioRun.mockClear();
  seedVersion();
});

describe("publish-time safety check", () => {
  it("passes a normal page and moderates its final guest-facing text", async () => {
    await expect(checkPublishSafety(EVENT_ID)).resolves.toEqual({ ok: true });
    const texts = mocks.moderatedTexts[0] ?? [];
    expect(texts).toEqual(expect.arrayContaining([DESIGN_SAMPLES[0]!.config.title]));
    expect(texts.length).toBeGreaterThan(5);
  });

  it("refuses a suspended event", async () => {
    seedVersion({}, { suspended_at: "2026-10-09T00:00:00.000Z" });
    await expect(checkPublishSafety(EVENT_ID)).resolves.toEqual({ ok: false, error: "event_suspended", status: 403 });
  });

  it("holds a page that asks guests for their bank login, before moderation runs", async () => {
    seedVersion({ goodToKnow: [{ title: "Gifts", body: "Enter your online banking login below to receive your gift card." }] });
    await expect(checkPublishSafety(EVENT_ID)).resolves.toEqual({ ok: false, error: "content_needs_review", status: 422 });
    expect(mocks.moderatedTexts).toEqual([]);
    expect(mocks.audits).toEqual([expect.objectContaining({ action: "safety.publish_held", eventId: EVENT_ID, metadata: { signals: "bank_details_request,credential_request" } })]);
  });

  it("holds a page whose travel link goes to a sign-in page", async () => {
    seedVersion({ travel: { items: [{ title: "Tickets", body: "Get yours", href: "https://tickets.example.com/login" }] } });
    await expect(checkPublishSafety(EVENT_ID)).resolves.toMatchObject({ ok: false, error: "content_needs_review" });
  });

  it("refuses text moderation blocks, recording only the category", async () => {
    mocks.textVerdict = blocked;
    await expect(checkPublishSafety(EVENT_ID)).resolves.toEqual({ ok: false, error: "content_not_allowed", status: 422 });
    expect(mocks.audits).toEqual([expect.objectContaining({ action: "safety.publish_blocked", metadata: { categories: "violence/graphic" } })]);
  });

  it("fails open when moderation is unavailable", async () => {
    mocks.textVerdict = { status: "unavailable", reason: "timeout" };
    await expect(checkPublishSafety(EVENT_ID)).resolves.toEqual({ ok: true });
  });
});

describe("a refused build brief costs nothing", () => {
  const parsed = { prompt: "A graphic, violent brief", slug: "my-party", images: [] };

  it("returns content_not_allowed before any job, credit or event exists", async () => {
    mocks.textVerdict = blocked;
    await expect(startBuildJob(parsed, "owner-1")).resolves.toEqual({ ok: false, error: "content_not_allowed", status: 422 });
    expect(mocks.createGenerationJob).not.toHaveBeenCalled();
    expect(mocks.reserveBuildCredit).not.toHaveBeenCalled();
    expect(mocks.createEventRecord).not.toHaveBeenCalled();
  });

  it("refuses a blocked reference photo the same way", async () => {
    mocks.imageVerdict = blocked;
    const result = await startBuildJob({ ...parsed, prompt: "A garden party", images: [{ name: "a.png", mediaType: "image/png", dataUrl: await pngDataUrl() }] }, "owner-1");
    expect(result).toEqual({ ok: false, error: "content_not_allowed", status: 422 });
    expect(mocks.reserveBuildCredit).not.toHaveBeenCalled();
  });

  it("goes ahead when moderation is unavailable (fail open)", async () => {
    mocks.textVerdict = { status: "unavailable", reason: "timeout" };
    await startBuildJob({ ...parsed, prompt: "A garden party" }, "owner-1");
    expect(mocks.createGenerationJob).toHaveBeenCalled();
  });
});

describe("studio routes refuse blocked content before charging", () => {
  it("studio messages: no run, no credit", async () => {
    mocks.textVerdict = blocked;
    const response = await sendStudioMessage(new NextRequest(`https://eventloom.test/api/events/${EVENT_ID}/studio/messages`, {
      method: "POST",
      headers: { origin: "https://eventloom.test", host: "eventloom.test", "content-type": "application/json" },
      body: JSON.stringify({ message: "Add a graphic description", baseVersionId: "version-1" }),
    }), { params: Promise.resolve({ eventId: EVENT_ID }) });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: "content_not_allowed" });
    expect(mocks.createStudioRun).not.toHaveBeenCalled();
    expect(mocks.reserveBuildCredit).not.toHaveBeenCalled();
  });

  it("studio create: no event, no credit", async () => {
    mocks.textVerdict = blocked;
    const form = new FormData();
    form.set("prompt", "A graphic, violent brief");
    form.set("slug", "my-party");
    const response = await createStudio(new NextRequest("https://eventloom.test/api/events/studio", { method: "POST", headers: { origin: "https://eventloom.test", host: "eventloom.test" }, body: form }));
    expect(response.status).toBe(422);
    expect(mocks.createEventRecord).not.toHaveBeenCalled();
    expect(mocks.reserveBuildCredit).not.toHaveBeenCalled();
  });

  it("studio create: a blocked photo refuses the whole request", async () => {
    mocks.imageVerdict = blocked;
    const form = new FormData();
    form.set("prompt", "A garden party");
    const png = Buffer.from((await pngDataUrl()).split(",")[1]!, "base64");
    form.append("images", new File([png], "a.png", { type: "image/png" }));
    const response = await createStudio(new NextRequest("https://eventloom.test/api/events/studio", { method: "POST", headers: { origin: "https://eventloom.test", host: "eventloom.test" }, body: form }));
    expect(response.status).toBe(422);
    expect(mocks.createEventRecord).not.toHaveBeenCalled();
  });
});

describe("uploaded images", () => {
  it("are moderated after resizing and never stored when blocked", async () => {
    mocks.imageVerdict = blocked;
    const upload = vi.fn();
    const client = { storage: { from: () => ({ upload, remove: vi.fn() }) }, from: vi.fn() };
    const png = Buffer.from((await pngDataUrl()).split(",")[1]!, "base64");
    await expect(processAndStoreEventImage(client as never, EVENT_ID, new File([png], "a.png", { type: "image/png" }))).resolves.toEqual({ error: "content_not_allowed" });
    expect(upload).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });
});
