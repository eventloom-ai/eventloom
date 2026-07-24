import { NextRequest, NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { referralJourneyFromPath } from "@/lib/event-entry";
import { REFERRAL_COOKIE, claimReferralJourney } from "@/lib/referrals/store";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(req.nextUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url));
  }

  const { data } = await supabase.auth.getUser();
  const referral = req.cookies.get(REFERRAL_COOKIE)?.value ?? referralJourneyFromPath(next);
  if (data.user && referral) {
    await claimReferralJourney({
      reference: referral,
      userId: data.user.id,
      userCreatedAt: data.user.created_at,
    }).catch(() => null);
  }

  return NextResponse.redirect(new URL(next, req.url));
}
