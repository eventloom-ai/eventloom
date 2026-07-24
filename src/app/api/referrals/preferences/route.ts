import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation, readJsonWithinLimit } from "@/lib/security/request";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  REFERRAL_PREFERENCE_COOKIE,
  REFERRAL_PREFERENCE_MAX_AGE,
  activeReferralJourney,
  setReferralConsent,
  withdrawReferral,
} from "@/lib/referrals/store";
import { referralGrowthEnabled } from "@/lib/env";

type PreferenceRequest = {
  action?: "accept" | "decline" | "withdraw";
  referral?: string;
};

const baseCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export async function GET(request: NextRequest) {
  const value = request.cookies.get(REFERRAL_PREFERENCE_COOKIE)?.value;
  return NextResponse.json({
    enabled: referralGrowthEnabled(),
    preference: value === "accepted" || value === "declined" ? value : "unset",
  });
}

export async function POST(request: NextRequest) {
  if (!referralGrowthEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = await readJsonWithinLimit<PreferenceRequest>(request, 2_048);
  if (!parsed.ok || !parsed.data?.action) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const currentReference = request.cookies.get(REFERRAL_COOKIE)?.value;
  const response = NextResponse.json({ ok: true });

  if (parsed.data.action === "withdraw") {
    await withdrawReferral(currentReference ?? parsed.data.referral);
    response.cookies.set(REFERRAL_COOKIE, "", { ...baseCookie, maxAge: 0 });
    response.cookies.set(REFERRAL_PREFERENCE_COOKIE, "declined", {
      ...baseCookie,
      maxAge: REFERRAL_PREFERENCE_MAX_AGE,
    });
    return response;
  }

  if (parsed.data.action === "decline") {
    if (currentReference) await withdrawReferral(currentReference);
    if (parsed.data.referral) await setReferralConsent(parsed.data.referral, "declined");
    response.cookies.set(REFERRAL_COOKIE, "", { ...baseCookie, maxAge: 0 });
    response.cookies.set(REFERRAL_PREFERENCE_COOKIE, "declined", {
      ...baseCookie,
      maxAge: REFERRAL_PREFERENCE_MAX_AGE,
    });
    return response;
  }

  const currentJourney = await activeReferralJourney(currentReference);
  const selectedReference = currentJourney ? currentReference : parsed.data.referral;
  if (!selectedReference || !(await setReferralConsent(selectedReference, "accepted"))) {
    return NextResponse.json({ error: "invalid_referral" }, { status: 400 });
  }
  response.cookies.set(REFERRAL_COOKIE, selectedReference, {
    ...baseCookie,
    maxAge: REFERRAL_COOKIE_MAX_AGE,
  });
  response.cookies.set(REFERRAL_PREFERENCE_COOKIE, "accepted", {
    ...baseCookie,
    maxAge: REFERRAL_PREFERENCE_MAX_AGE,
  });
  return response;
}
