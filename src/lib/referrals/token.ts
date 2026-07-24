import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env, referralGrowthEnabled } from "@/lib/env";

const SOURCE_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 365;
const JOURNEY_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 30;

type ReferralToken =
  | { kind: "source"; eventId: string; expiresAt: number }
  | { kind: "journey"; journeyId: string; expiresAt: number };

function secret() {
  if (env.referralTokenSecret()) return env.referralTokenSecret();
  return process.env.NODE_ENV === "production" ? "" : "eventloom-referral-local-development-only";
}

function sign(payload: ReferralToken) {
  const key = secret();
  if (!key || !referralGrowthEnabled()) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", key).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verify(token: string): ReferralToken | null {
  const key = secret();
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!key || !referralGrowthEnabled() || !encoded || !suppliedSignature || extra) return null;
  const expected = createHmac("sha256", key).update(encoded).digest("base64url");
  const actualBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ReferralToken;
    if (
      !value ||
      !Number.isSafeInteger(value.expiresAt) ||
      value.expiresAt < Math.floor(Date.now() / 1000)
    ) return null;
    if (value.kind === "source" && value.eventId) return value;
    if (value.kind === "journey" && value.journeyId) return value;
    return null;
  } catch {
    return null;
  }
}

export function createReferralSourceToken(eventId: string, lifetimeSeconds = SOURCE_TOKEN_LIFETIME_SECONDS) {
  return sign({
    kind: "source",
    eventId,
    expiresAt: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  });
}

export function verifyReferralSourceToken(token: string) {
  const value = verify(token);
  return value?.kind === "source" ? value : null;
}

export function createReferralJourneyReference(journeyId: string, lifetimeSeconds = JOURNEY_TOKEN_LIFETIME_SECONDS) {
  return sign({
    kind: "journey",
    journeyId,
    expiresAt: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  });
}

export function verifyReferralJourneyReference(token: string | null | undefined) {
  if (!token) return null;
  const value = verify(token);
  return value?.kind === "journey" ? value : null;
}
