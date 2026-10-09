import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportOperationalEvent } from "@/lib/monitoring";
import { REPORT_REASON_VALUES } from "@/lib/safety/report-reasons";
import { clientIpHash, isSameOriginMutation, readJsonWithinLimit, requestWithinLimit } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { TURNSTILE_ACTIONS } from "@/lib/security/turnstile-shared";
import { serviceSupabase } from "@/lib/supabase/server";

// Reports per network per hour, and per network per page per day: enough for a real guest, useless for flooding.
const REPORTS_PER_IP_PER_HOUR = 5;
const REPORTS_PER_IP_PER_PAGE_PER_DAY = 2;

const reportSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(63),
  reason: z.enum(REPORT_REASON_VALUES),
  details: z.string().trim().max(2000).default(""),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]).optional(),
  turnstileToken: z.string().max(4096).default(""),
});

/**
 * "Report this page": anyone can report an event page. Turnstile is always required (reporters are guests, not
 * creators), storage is rate-limited per keyed IP hash, the raw IP is never stored, and the reporter's email is
 * kept only when they chose to give it. The response never says whether the page exists.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request) || !requestWithinLimit(request, 10_000)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const raw = await readJsonWithinLimit(request, 10_000);
  if (!raw.ok) return NextResponse.json({ error: "invalid_request" }, { status: raw.error === "payload_too_large" ? 413 : 400 });
  const parsed = reportSchema.safeParse(raw.data);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const remoteIp = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim();
  const human = await verifyTurnstile(parsed.data.turnstileToken, {
    expectedAction: TURNSTILE_ACTIONS.abuseReport,
    expectedHostname: request.nextUrl.hostname,
    remoteIp: remoteIp || undefined,
  });
  if (!human) return NextResponse.json({ error: "verification_required" }, { status: 400 });

  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const ipHash = clientIpHash(request);
  if (!ipHash) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [hourly, perPage] = await Promise.all([
    client.from("abuse_reports").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
    client.from("abuse_reports").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("slug", parsed.data.slug).gte("created_at", dayAgo),
  ]);
  if (hourly.error || perPage.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if ((hourly.count ?? 0) >= REPORTS_PER_IP_PER_HOUR || (perPage.count ?? 0) >= REPORTS_PER_IP_PER_PAGE_PER_DAY) {
    return NextResponse.json({ error: "try_later" }, { status: 429 });
  }

  const { data: event } = await client.from("events").select("id").eq("slug", parsed.data.slug).maybeSingle();
  const { data, error } = await client
    .from("abuse_reports")
    .insert({
      event_id: event?.id ?? null,
      slug: parsed.data.slug,
      reason: parsed.data.reason,
      details: parsed.data.details,
      reporter_email: parsed.data.email || null,
      ip_hash: ipHash,
    })
    .select("id")
    .single();
  if (error || !data) {
    reportOperationalEvent("error", "abuse_report_store_failed", { databaseCode: error?.code, reason: parsed.data.reason });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // Category and ids only: never the details or the reporter's email.
  reportOperationalEvent("warn", "abuse_report_received", { reportId: data.id, eventId: event?.id ?? null, reason: parsed.data.reason });
  return NextResponse.json({ ok: true }, { status: 201 });
}
