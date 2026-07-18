import { NextRequest } from "next/server";
import { canEditEvent, getStudioRun, loadRunEvents } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string; runId: string }> }) {
  const { eventId, runId } = await params;
  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return new Response("not_found", { status: 404 });
  const run = await getStudioRun(runId);
  if (!run || run.event_id !== eventId) return new Response("not_found", { status: 404 });
  const queryCursor = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const reconnectCursor = Number(req.headers.get("last-event-id") ?? 0) || 0;
  const initialCursor = Math.max(0, queryCursor, reconnectCursor);
  const encoder = new TextEncoder();
  let cursor = initialCursor;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const started = Date.now();
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      while (!closed && Date.now() - started < 295_000) {
        if (req.signal.aborted) return close();
        const events = await loadRunEvents(runId, cursor);
        for (const event of events) {
          cursor = event.sequence;
          controller.enqueue(encoder.encode(`id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`));
        }
        const current = await getStudioRun(runId);
        if (current && current.status !== "running" && events.length === 0) {
          controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ status: current.status, cursor })}\n\n`));
          return close();
        }
        controller.enqueue(encoder.encode(": keepalive\n\n"));
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
      close();
    },
    cancel() { closed = true; },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
