import { NextRequest, NextResponse } from "next/server";
import { processAndStoreEventImage, processEventImageAsDataUrl } from "@/lib/event-assets";
import { canEditEvent } from "@/lib/studio-store";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 11 * 1024 * 1024)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const { eventId } = await params;
  const client = serviceSupabase();

  if (!client) {
    if (!(await canEditEvent(eventId, null))) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    const result = await processEventImageAsDataUrl(file);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "invalid_image" ? 400 : 500 });
    return NextResponse.json(result);
  }

  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  const result = await processAndStoreEventImage(client, eventId, file);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "invalid_image" ? 400 : 500 });
  return NextResponse.json(result);
}
