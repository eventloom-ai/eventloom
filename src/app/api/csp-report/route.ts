import { NextRequest, NextResponse } from "next/server";
import { reportOperationalEvent } from "@/lib/monitoring";
import { readJsonWithinLimit } from "@/lib/security/request";
import { RATE_LIMITS, checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  // Over the limit, reports are dropped silently: browsers never retry and a 429 would only add noise.
  if (!(await checkRateLimit(request, RATE_LIMITS.cspReport)).allowed) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const parsed = await readJsonWithinLimit<{ "csp-report"?: Record<string, unknown> }>(request, 8_192);
  if (!parsed.ok) return new NextResponse(null, { status: parsed.error === "payload_too_large" ? 413 : 400 });
  const body = parsed.data;
  const report = body?.["csp-report"];
  if (report) {
    reportOperationalEvent("warn", "csp_violation", {
      directive: typeof report["violated-directive"] === "string" ? report["violated-directive"].slice(0, 100) : "unknown",
      disposition: typeof report.disposition === "string" ? report.disposition.slice(0, 30) : "unknown",
      statusCode: typeof report["status-code"] === "number" ? report["status-code"] : null,
    });
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
