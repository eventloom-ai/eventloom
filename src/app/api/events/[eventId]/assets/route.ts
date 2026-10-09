import { NextRequest, NextResponse } from "next/server";
import { processAndStoreEventImage, storeDemoEventImage } from "@/lib/event-assets";
import { canEditEvent } from "@/lib/studio-store";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
import { isSameOriginMutation, requestWithinLimit } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isSameOriginMutation(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!requestWithinLimit(req, 11 * 1024 * 1024)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const { eventId } = await params;
  const client = serviceSupabase();

  if (!client) {
    if (!(await canEditEvent(eventId, null))) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const limited = await enforceRateLimit(req, RATE_LIMITS.assetUpload);
    if (limited) return limited;
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    // Demo mode keeps the processed photo in the in-memory demo store and serves it from /api/assets/<id>,
    // so it saves like a stored photo (a data: URL is rejected by the page schemas).
    const result = await storeDemoEventImage(file);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "invalid_image" ? 400 : 500 });
    return NextResponse.json(result);
  }

  const user = await getServerUser();
  if (!user || !(await canEditEvent(eventId, user.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const limited = await enforceRateLimit(req, RATE_LIMITS.assetUpload, { userId: user.id });
  if (limited) return limited;
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  const result = await processAndStoreEventImage(client, eventId, file);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "invalid_image" ? 400 : 500 });
  return NextResponse.json(result);
}
