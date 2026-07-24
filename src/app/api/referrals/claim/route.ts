import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { isSameOriginMutation, readJsonWithinLimit } from "@/lib/security/request";
import { REFERRAL_COOKIE, claimReferralJourney } from "@/lib/referrals/store";
import { referralGrowthEnabled } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!referralGrowthEnabled()) return NextResponse.json({ ok: true, attributed: false });
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = await readJsonWithinLimit<{ referral?: string }>(request, 4_096);
  if (!parsed.ok) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const reference = request.cookies.get(REFERRAL_COOKIE)?.value ?? parsed.data?.referral;
  const journeyId = await claimReferralJourney({
    reference,
    userId: user.id,
    userCreatedAt: user.created_at,
  });
  return NextResponse.json({ ok: true, attributed: Boolean(journeyId) });
}
