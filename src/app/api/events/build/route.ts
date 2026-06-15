import { NextRequest } from "next/server";
import { buildCompleteSite } from "@/lib/agent/harness";
import { enrichPromptWithTheme, parseBuildForm } from "@/lib/agent/parse-build-form";
import type { BuildProgressEvent } from "@/lib/agent/progress";
import { getServerUser } from "@/lib/supabase/server";

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

  const parsed = await parseBuildForm(form, body);

  if (!parsed.slug || !parsed.prompt.trim()) {
    return new Response(encode({ step: "error", message: "invalid" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const slug = parsed.slug;
  const ownerId = (await getServerUser())?.id ?? null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: BuildProgressEvent) => {
        controller.enqueue(encode(event));
      };

      const result = await buildCompleteSite({
        prompt: enrichPromptWithTheme(parsed.prompt, parsed.themeOverrides),
        slug,
        images: parsed.images,
        templateHint: parsed.templateHint,
        themeOverrides: parsed.themeOverrides,
        existingEventId: parsed.existingEventId,
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
