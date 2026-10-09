import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  key: "sk-test",
  production: false,
  events: [] as Array<{ level: string; event: string; context: Record<string, unknown> }>,
}));

vi.mock("@/lib/env", () => ({ env: { openaiApiKey: () => mocks.key }, isProductionDeployment: () => mocks.production }));
vi.mock("@/lib/monitoring", () => ({
  reportOperationalEvent: (level: string, event: string, context: Record<string, unknown> = {}) => mocks.events.push({ level, event, context }),
}));

import { MODERATION_MODEL, blockedCategories, combineVerdicts, moderateImage, moderateText } from "@/lib/safety/moderation";

type Scores = Record<string, number>;
const result = (scores: Scores, flagged: Record<string, boolean> = {}) => ({ flagged: Object.keys(flagged).length > 0, categories: flagged, category_scores: scores });
const provider = (...results: ReturnType<typeof result>[]) => vi.fn(async () => new Response(JSON.stringify({ id: "modr-1", model: MODERATION_MODEL, results }), { status: 200 }));
const context = { surface: "studio_message" as const, eventId: "event-1" };
const SECRET_TEXT = "This exact host text must never be logged";

describe("moderation policy (mocked provider)", () => {
  beforeEach(() => {
    mocks.key = "sk-test";
    mocks.production = false;
    mocks.events = [];
  });
  afterEach(() => vi.unstubAllGlobals());

  it("blocks clearly prohibited categories at high confidence and logs only the category and event id", async () => {
    const fetchMock = provider(result({ "violence/graphic": 0.97, violence: 0.99 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(moderateText(SECRET_TEXT, context)).resolves.toEqual({ status: "blocked", categories: ["violence/graphic"] });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/moderations");
    expect(JSON.parse(String(init.body))).toEqual({ model: "omni-moderation-latest", input: [SECRET_TEXT] });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(mocks.events).toEqual([{ level: "warn", event: "content_blocked", context: { surface: "studio_message", eventId: "event-1", categories: "violence/graphic" } }]);
    expect(JSON.stringify(mocks.events)).not.toContain(SECRET_TEXT);
  });

  it("allows normal party copy, including high scores in categories that never block on their own", async () => {
    // "A killer playlist and a roast of the groom": plain violence/harassment/hate never block, only their severe forms.
    vi.stubGlobal("fetch", provider(result({ violence: 0.95, harassment: 0.9, hate: 0.6, sexual: 0.4, illicit: 0.5 })));
    await expect(moderateText("Join us for a killer playlist and a roast of the groom!", context)).resolves.toEqual({ status: "allowed" });
    expect(mocks.events).toEqual([]);
  });

  it("does not block below the high-confidence thresholds", () => {
    expect(blockedCategories([result({ sexual: 0.89, "hate/threatening": 0.79, "harassment/threatening": 0.84, "self-harm/instructions": 0.79, illicit: 0.89 })])).toEqual([]);
    expect(blockedCategories([result({ sexual: 0.95, "hate/threatening": 0.85, "harassment/threatening": 0.9, "self-harm/instructions": 0.85, illicit: 0.95, "illicit/violent": 0.85 })])).toEqual([
      "harassment/threatening", "hate/threatening", "illicit", "illicit/violent", "self-harm/instructions", "sexual",
    ]);
  });

  it("treats sexual content involving minors as zero tolerance: any provider flag or a low score blocks", () => {
    expect(blockedCategories([result({ "sexual/minors": 0.05 }, { "sexual/minors": true })])).toEqual(["sexual/minors"]);
    expect(blockedCategories([result({ "sexual/minors": 0.35 })])).toEqual(["sexual/minors"]);
    expect(blockedCategories([result({ "sexual/minors": 0.1 })])).toEqual([]);
  });

  it("blocks when any chunk of a long page is blocked", async () => {
    vi.stubGlobal("fetch", provider(result({}), result({ "hate/threatening": 0.92 })));
    await expect(moderateText(["a".repeat(9_000), "b"], context)).resolves.toMatchObject({ status: "blocked", categories: ["hate/threatening"] });
  });

  it("sends images as image_url inputs", async () => {
    const fetchMock = provider(result({ sexual: 0.98 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(moderateImage("data:image/jpeg;base64,AAAA", { surface: "image_upload", eventId: "event-1" })).resolves.toEqual({ status: "blocked", categories: ["sexual"] });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).input).toEqual([{ type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } }]);
  });

  it("fails open on a provider error and records the miss", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    await expect(moderateText(SECRET_TEXT, context)).resolves.toEqual({ status: "unavailable", reason: "http_500" });
    expect(mocks.events).toEqual([{ level: "warn", event: "moderation_unavailable", context: { surface: "studio_message", eventId: "event-1", reason: "http_500" } }]);
  });

  it("fails open on a timeout and records the miss", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("The operation timed out.", "TimeoutError"); }));
    await expect(moderateText(SECRET_TEXT, context)).resolves.toEqual({ status: "unavailable", reason: "timeout" });
    expect(mocks.events[0]).toMatchObject({ event: "moderation_unavailable", context: { reason: "timeout" } });
  });

  it("fails open on an unreadable response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json", { status: 200 })));
    await expect(moderateText(SECRET_TEXT, context)).resolves.toEqual({ status: "unavailable", reason: "invalid_response" });
  });

  it("skips the call without a key, logging the miss only in production", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mocks.key = "";
    await expect(moderateText(SECRET_TEXT, context)).resolves.toEqual({ status: "unavailable", reason: "not_configured" });
    expect(mocks.events).toEqual([]);
    mocks.production = true;
    await moderateText(SECRET_TEXT, context);
    expect(mocks.events).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks nothing for empty text", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(moderateText(["  ", ""], context)).resolves.toEqual({ status: "allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("combines several checks: any block wins, then any miss", () => {
    expect(combineVerdicts([{ status: "allowed" }, { status: "blocked", categories: ["sexual"] }, { status: "unavailable", reason: "timeout" }])).toEqual({ status: "blocked", categories: ["sexual"] });
    expect(combineVerdicts([{ status: "allowed" }, { status: "unavailable", reason: "timeout" }])).toEqual({ status: "unavailable", reason: "timeout" });
    expect(combineVerdicts([{ status: "allowed" }])).toEqual({ status: "allowed" });
  });
});
