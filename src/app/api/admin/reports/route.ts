import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { REPORT_REASON_VALUES } from "@/lib/safety/report-reasons";
import { clearSuspensionCache } from "@/lib/safety/suspension-gate";
import { liftSuspension, resolveReport, suspendEvent } from "@/lib/safety/takedown";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { recordAuditEvent } from "@/lib/security/audit";
import { isSameOriginMutation, readJsonWithinLimit, requestWithinLimit } from "@/lib/security/request";
import { serviceSupabase } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const actionSchema = z.discriminatedUnion("action", [
  // From a report (eventId) or typed in by an admin who found the page some other way (slug).
  z.object({
    action: z.literal("suspend"),
    eventId: uuid.optional(),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(63).optional(),
    reason: z.enum(REPORT_REASON_VALUES),
    reportId: uuid.optional(),
  }).refine((value) => Boolean(value.eventId || value.slug), "event_required"),
  z.object({ action: z.literal("unsuspend"), eventId: uuid }),
  z.object({ action: z.literal("dismiss"), reportId: uuid }),
  z.object({ action: z.literal("reviewing"), reportId: uuid }),
]);

/**
 * Takedown actions from /admin. Platform admins only, with a verified email and MFA (aal2) like every other admin
 * action; anyone else gets a 404. Accepts the admin page's plain HTML forms (303 back to /admin) or JSON.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request) || !requestWithinLimit(request, 4_000)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth || !auth.emailVerified || !hasRequiredMfa(auth) || !(await isPlatformAdmin(auth.user.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isForm = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  let input: unknown;
  if (isForm) {
    input = Object.fromEntries([...(await request.formData()).entries()].filter(([, value]) => typeof value === "string" && value !== ""));
  } else {
    const body = await readJsonWithinLimit(request, 4_000);
    input = body.ok ? body.data : null;
  }
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const action = parsed.data;
  const adminId = auth.user.id;
  let failure: string | null = null;

  if (action.action === "suspend") {
    const eventId = action.eventId ?? (await client.from("events").select("id").eq("slug", action.slug!).maybeSingle()).data?.id as string | undefined;
    const result = eventId ? await suspendEvent(client, { eventId, reason: action.reason, adminId }) : { ok: false as const, error: "not_found" };
    if (!result.ok) failure = result.error;
    else {
      await recordAuditEvent({ action: "event.suspended", actorUserId: adminId, actorType: "admin", eventId, targetType: "event", targetId: eventId, metadata: { reason: action.reason, report_id: action.reportId ?? null } });
      purgeEventPages(result.slug);
    }
  } else if (action.action === "unsuspend") {
    const result = await liftSuspension(client, { eventId: action.eventId });
    if (!result.ok) failure = result.error;
    else {
      await recordAuditEvent({ action: "event.unsuspended", actorUserId: adminId, actorType: "admin", eventId: action.eventId, targetType: "event", targetId: action.eventId });
      purgeEventPages(result.slug);
    }
  } else {
    const status = action.action === "dismiss" ? "dismissed" : "reviewing";
    const result = await resolveReport(client, { reportId: action.reportId, status, adminId });
    if (!result.ok) failure = result.error;
    else await recordAuditEvent({ action: `abuse_report.${status}`, actorUserId: adminId, actorType: "admin", eventId: result.eventId, targetType: "abuse_report", targetId: action.reportId });
  }

  if (failure) {
    return isForm
      ? NextResponse.redirect(new URL(`/admin?moderation=${encodeURIComponent(failure)}#reports`, request.url), { status: 303 })
      : NextResponse.json({ error: failure }, { status: failure === "not_found" ? 404 : 500 });
  }
  return isForm
    ? NextResponse.redirect(new URL(`/admin?moderation=${action.action}#reports`, request.url), { status: 303 })
    : NextResponse.json({ ok: true });
}

// Share cards are CDN-cached per id for a day; drop this event's (and every custom-domain card, which are keyed by
// host) so a takedown removes its preview too. The proxy's 30s lookup cache on this instance is cleared as well.
function purgeEventPages(slug: string) {
  clearSuspensionCache();
  try {
    revalidatePath(`/${slug}`, "layout");
    revalidatePath("/sites/[host]", "layout");
  } catch {
    // Outside a Next.js request (tests) there is no cache to purge.
  }
}
