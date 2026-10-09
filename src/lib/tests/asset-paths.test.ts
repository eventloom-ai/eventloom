import { describe, expect, it } from "vitest";
import { isEventAssetPath } from "@/lib/asset-paths";

const eventId = "10000000-0000-4000-8000-000000000001";

describe("isEventAssetPath", () => {
  it("accepts objects in the owning event's folder of the private bucket", () => {
    expect(isEventAssetPath({ bucket: "event-assets-private", path: `${eventId}/2f1c.webp` }, eventId)).toBe(true);
  });

  it("rejects other buckets, other events' folders, and traversal", () => {
    expect(isEventAssetPath({ bucket: "avatars", path: `${eventId}/a.webp` }, eventId)).toBe(false);
    expect(isEventAssetPath({ bucket: "event-assets-private", path: "20000000-0000-4000-8000-000000000002/a.webp" }, eventId)).toBe(false);
    expect(isEventAssetPath({ bucket: "event-assets-private", path: `${eventId}/../other/a.webp` }, eventId)).toBe(false);
    expect(isEventAssetPath({ bucket: "event-assets-private", path: `${eventId}/nested/a.webp` }, eventId)).toBe(false);
    expect(isEventAssetPath(null, eventId)).toBe(false);
  });
});
