import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stored: [] as Array<{ eventId: string; type: string; size: number }>,
}));

vi.mock("@/lib/agent/harness", () => ({ buildCompleteSite: vi.fn() }));
vi.mock("@/lib/agent/tools", () => ({ createEventRecord: vi.fn(), createGenerationJob: vi.fn(), placeholderEventConfig: vi.fn() }));
vi.mock("@/lib/payments/billing", () => ({ isEventOwner: vi.fn(), reserveBuildCredit: vi.fn() }));
vi.mock("@/lib/studio-store", () => ({ reapStaleGenerationJobs: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => ({}) }));
vi.mock("@/lib/event-assets", () => ({
  processAndStoreEventImage: async (_client: unknown, eventId: string, file: File) => {
    mocks.stored.push({ eventId, type: file.type, size: file.size });
    return file.type === "image/gif" ? { error: "invalid_image" } : { id: "asset-1", url: "/api/assets/00000000-0000-4000-8000-0000000000aa" };
  },
}));

import { applyImagesToConfig } from "@/lib/agent/parse-build-form";
import { storeReferenceImages } from "@/lib/agent/start-build";

describe("build reference images", () => {
  it("stores uploads as event assets so the site config never carries a data: URL", async () => {
    const images = await storeReferenceImages("event-1", [
      { name: "hero.png", mediaType: "image/png", dataUrl: "data:image/png;base64,aGVsbG8=" },
      { name: "loop.gif", mediaType: "image/gif", dataUrl: "data:image/gif;base64,aGVsbG8=" },
    ]);
    expect(mocks.stored).toEqual([{ eventId: "event-1", type: "image/png", size: 5 }, { eventId: "event-1", type: "image/gif", size: 5 }]);
    expect(images[0]?.storedUrl).toBe("/api/assets/00000000-0000-4000-8000-0000000000aa");
    expect(images[1]?.storedUrl).toBeUndefined();
    expect(applyImagesToConfig({}, images)).toEqual({ heroImageUrl: "/api/assets/00000000-0000-4000-8000-0000000000aa", galleryImageUrls: ["data:image/gif;base64,aGVsbG8="] });
  });
});
