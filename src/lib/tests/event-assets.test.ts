import { describe, expect, it, vi } from "vitest";
import { processAndStoreEventImage } from "@/lib/event-assets";

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
