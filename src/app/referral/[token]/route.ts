import { NextRequest, NextResponse } from "next/server";
import { env, referralGrowthEnabled } from "@/lib/env";
import { serviceSupabase } from "@/lib/supabase/server";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  REFERRAL_PREFERENCE_COOKIE,
  activeReferralJourney,
  createReferralJourney,
  setReferralConsent,
} from "@/lib/referrals/store";
import {
  createReferralJourneyReference,
  verifyReferralSourceToken,
} from "@/lib/referrals/token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function isAutomatedReferralRequest(userAgent: string | null) {
  return /bot|crawler|spider|preview|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|linkedinbot/i.test(userAgent ?? "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!referralGrowthEnabled()) return new NextResponse("Not found", { status: 404 });
  const { token } = await params;
  const source = verifyReferralSourceToken(token);
  const client = serviceSupabase();
  if (!source || !client) return new NextResponse("Not found", { status: 404 });
  if (isAutomatedReferralRequest(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 204 });
  }

  const { data: event } = await client
    .from("events")
    .select("id")
    .eq("id", source.eventId)
    .eq("status", "published")
    .maybeSingle();
  if (!event) return new NextResponse("Not found", { status: 404 });

  const clickedJourneyId = await createReferralJourney(source.eventId);
  if (!clickedJourneyId) return new NextResponse("Not found", { status: 404 });

  const existingReference = request.cookies.get(REFERRAL_COOKIE)?.value;
  const existingJourney = await activeReferralJourney(existingReference);
  const selectedReference = existingJourney
    ? existingReference!
    : createReferralJourneyReference(clickedJourneyId);
  if (!selectedReference) return new NextResponse("Not found", { status: 404 });

  const destination = new URL(env.appUrl());
  destination.pathname = "/";
  destination.search = "";
  destination.searchParams.set("ref", selectedReference);
  destination.hash = "create";
  const response = NextResponse.redirect(destination);

  if (
    !existingJourney &&
    request.cookies.get(REFERRAL_PREFERENCE_COOKIE)?.value === "accepted"
  ) {
    await setReferralConsent(selectedReference, "accepted");
    response.cookies.set(REFERRAL_COOKIE, selectedReference, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
    });
  }
  return response;
}
