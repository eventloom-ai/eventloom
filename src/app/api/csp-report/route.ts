import { NextRequest, NextResponse } from "next/server";
import { reportOperationalEvent } from "@/lib/monitoring";
import { readJsonWithinLimit } from "@/lib/security/request";

export async function POST(request: NextRequest) {
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
