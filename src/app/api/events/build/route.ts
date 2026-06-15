import { NextRequest } from "next/server";
import type { ImageInput } from "@/lib/ai/generator";
import { buildCompleteSite } from "@/lib/agent/harness";
import type { BuildProgressEvent } from "@/lib/agent/progress";
import { getServerUser } from "@/lib/supabase/server";
import { slugSchema } from "@/lib/validation";

export const maxDuration = 60;

function encode(event: BuildProgressEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await req.formData() : null;
  const body = form
    ? Object.fromEntries(form.entries())
    : contentType.includes("application/json")
      ? await req.json()
      : {};

  const slug = slugSchema.safeParse(body.slug);
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const templateHint = body.template === "wedding" ? ("wedding" as const) : undefined;

  if (!slug.success || !prompt.trim()) {
    return new Response(encode({ step: "error", message: "invalid" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const images = form ? await readImages(form) : [];
  const ownerId = (await getServerUser())?.id ?? null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: BuildProgressEvent) => {
        controller.enqueue(encode(event));
      };

      const result = await buildCompleteSite({
        prompt,
        slug: slug.data,
        images,
        templateHint,
        ownerId,
        onProgress: send,
      });

      if (!result.ok) {
        controller.close();
        return;
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function readImages(form: FormData): Promise<ImageInput[]> {
  return Promise.all(
    form
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.type.startsWith("image/"))
      .slice(0, 4)
      .map(async (file) => ({
        name: file.name,
        mediaType: file.type,
        dataUrl: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`,
      })),
  );
}
