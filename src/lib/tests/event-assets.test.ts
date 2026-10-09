import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { MAX_EVENT_IMAGE_EDGE_PX, processAndStoreEventImage } from "@/lib/event-assets";

const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function pngFile(name = "photo.png") {
  const bytes = Buffer.from(ONE_PIXEL_PNG_BASE64, "base64");
  return new File([bytes], name, { type: "image/png" });
}

function mockClient(overrides?: { uploadError?: unknown; insertError?: unknown }) {
  const upload = vi.fn().mockResolvedValue({ error: overrides?.uploadError ?? null });
  const remove = vi.fn().mockResolvedValue({});
  const insertSingle = vi.fn().mockResolvedValue(overrides?.insertError ? { data: null, error: overrides.insertError } : { data: { id: "asset-123" }, error: null });
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const insert = vi.fn(() => ({ select: insertSelect }));
  const updateEq = vi.fn().mockResolvedValue({});
  const update = vi.fn(() => ({ eq: updateEq }));
  const client = {
    storage: { from: vi.fn(() => ({ upload, remove })) },
    from: vi.fn(() => ({ insert, update })),
  };
  return { client, upload, remove, insert, update };
}

describe("processAndStoreEventImage", () => {
  it("processes and stores a valid image, returning its proxy URL", async () => {
    const { client, upload, insert } = mockClient();
    const result = await processAndStoreEventImage(client as never, "event-1", pngFile());
    expect(result).toEqual({ id: "asset-123", url: "/api/assets/asset-123" });
    expect(upload).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledOnce();
  });

  it("resizes large uploads to the long-edge cap, applies EXIF orientation, and strips metadata", async () => {
    const { client, upload, insert } = mockClient();
    const jpeg = await sharp({ create: { width: 4_000, height: 3_000, channels: 3, background: "#b48a5a" } })
      .jpeg({ quality: 90 })
      .withExif({ IFD0: { Copyright: "Guest photographer", Make: "Camera" } })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(jpeg).metadata()).exif).toBeDefined();

    await processAndStoreEventImage(client as never, "event-1", new File([new Uint8Array(jpeg)], "portrait.jpg", { type: "image/jpeg" }));
    const [path, stored, options] = upload.mock.calls[0] as unknown as [string, Buffer, { contentType: string }];
    const output = await sharp(stored).metadata();
    expect(path).toMatch(/^event-1\/[0-9a-f-]{36}\.webp$/);
    expect(options.contentType).toBe("image/webp");
    expect([output.format, output.width, output.height]).toEqual(["webp", 1_800, MAX_EVENT_IMAGE_EDGE_PX]);
    expect(output.exif).toBeUndefined();
    expect(output.orientation).toBeUndefined();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ width: 1_800, height: MAX_EVENT_IMAGE_EDGE_PX, size: stored.length }) }));
  });

  it("never enlarges small uploads", async () => {
    const { client, upload } = mockClient();
    await processAndStoreEventImage(client as never, "event-1", pngFile());
    const output = await sharp((upload.mock.calls[0] as unknown as [string, Buffer])[1]).metadata();
    expect([output.width, output.height]).toEqual([1, 1]);
  });

  it("rejects a disallowed file type without touching storage", async () => {
    const { client, upload } = mockClient();
    const file = new File([Buffer.from(ONE_PIXEL_PNG_BASE64, "base64")], "photo.gif", { type: "image/gif" });
    const result = await processAndStoreEventImage(client as never, "event-1", file);
    expect(result).toEqual({ error: "invalid_image" });
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    const { client, upload } = mockClient();
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    const result = await processAndStoreEventImage(client as never, "event-1", big);
    expect(result).toEqual({ error: "invalid_image" });
    expect(upload).not.toHaveBeenCalled();
  });

  it("cleans up the uploaded object if the asset row insert fails", async () => {
    const { client, remove } = mockClient({ insertError: { message: "insert failed" } });
    const result = await processAndStoreEventImage(client as never, "event-1", pngFile());
    expect(result).toEqual({ error: "upload_failed" });
    expect(remove).toHaveBeenCalledOnce();
  });

  it("reports upload_failed when storage upload itself fails", async () => {
    const { client } = mockClient({ uploadError: { message: "storage down" } });
    const result = await processAndStoreEventImage(client as never, "event-1", pngFile());
    expect(result).toEqual({ error: "upload_failed" });
  });
});
