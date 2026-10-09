import { NextRequest } from "next/server";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => null, getServerUser: async () => null }));
vi.mock("@/lib/agent/harness", () => ({ buildCompleteSite: vi.fn() }));

import { GET } from "@/app/api/assets/[assetId]/route";
import { storeReferenceImages } from "@/lib/agent/start-build";

const get = (id: string) => GET(new NextRequest(`https://eventloom.test/api/assets/${id}`), { params: Promise.resolve({ assetId: id }) });

describe("demo-mode reference photos", () => {
  it("are processed, kept in memory and served from /api/assets like stored assets", async () => {
    const png = await sharp({ create: { width: 8, height: 6, channels: 3, background: "#c96" } }).png().toBuffer();
    const [image] = await storeReferenceImages(null, [{ name: "hero.png", mediaType: "image/png", dataUrl: `data:image/png;base64,${png.toString("base64")}` }]);
    expect(image.storedUrl).toMatch(/^\/api\/assets\/[0-9a-f-]{36}$/);
    const response = await get(image.storedUrl!.split("/").at(-1)!);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width).toBe(8);
    expect((await get("00000000-0000-4000-8000-000000000000")).status).toBe(404);
  });
});
