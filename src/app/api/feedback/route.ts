import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportOperationalEvent } from "@/lib/monitoring";
import { getAuthContext } from "@/lib/security/auth";
import { clientIpHash, isSameOriginMutation, readJsonWithinLimit, requestWithinLimit } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { serviceSupabase } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  category: z.enum(["bug", "confusing", "idea", "praise"]),
  rating: z.number().int().min(1).max(5).optional(),
  message: z.string().trim().min(10).max(2000),
  pagePath: z.string().trim().regex(/^\/[^\s]*$/).max(240),
  turnstileToken: z.string().max(4096).default(""),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request) || !requestWithinLimit(request, 10_000)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const raw = await readJsonWithinLimit(request, 10_000);
  if (!raw.ok) {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: raw.error === "payload_too_large" ? 413 : 400 },
    );
  }

  const parsed = feedbackSchema.safeParse(raw.data);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const auth = await getAuthContext();
  const humanVerified = auth ? true : await verifyTurnstile(parsed.data.turnstileToken);
  if (!auth && !humanVerified) {
    return NextResponse.json({ error: "verification_required" }, { status: 400 });
  }

  const client = serviceSupabase();
  if (!client) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const ipHash = clientIpHash(request);
  if (!auth && !ipHash) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let recentQuery = client
    .from("product_feedback")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  recentQuery = auth
    ? recentQuery.eq("user_id", auth.user.id)
    : recentQuery.eq("ip_hash", ipHash as string);
  const recent = await recentQuery;
  if (recent.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if ((recent.count ?? 0) >= 5) {
    return NextResponse.json({ error: "try_later" }, { status: 429 });
  }

  const { data, error } = await client
    .from("product_feedback")
    .insert({
      user_id: auth?.user.id ?? null,
      category: parsed.data.category,
      rating: parsed.data.rating ?? null,
      message: parsed.data.message,
      page_path: parsed.data.pagePath,
      ip_hash: ipHash,
      user_agent_class: (request.headers.get("user-agent") ?? "unknown").slice(0, 160),
    })
    .select("id")
    .single();

  if (error || !data) {
    reportOperationalEvent("error", "product_feedback_store_failed", {
      databaseCode: error?.code,
      category: parsed.data.category,
    });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  reportOperationalEvent("info", "product_feedback_received", {
    feedbackId: data.id,
    category: parsed.data.category,
    authenticated: Boolean(auth),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
