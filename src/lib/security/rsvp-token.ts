import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

type PublicRsvpToken = { eventId: string; slug: string; expiresAt: number };

function secret() {
  if (env.rsvpTokenSecret()) return env.rsvpTokenSecret();
  return process.env.NODE_ENV === "production" ? "" : "eventloom-local-development-only";
}

export function createPublicRsvpToken(eventId: string, slug: string, lifetimeSeconds = 60 * 60 * 12) {
  const key = secret();
  if (!key) return null;
  const payload: PublicRsvpToken = { eventId, slug, expiresAt: Math.floor(Date.now() / 1000) + lifetimeSeconds };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", key).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyPublicRsvpToken(token: string): PublicRsvpToken | null {
  const key = secret();
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!key || !encoded || !suppliedSignature || extra) return null;
  const expected = createHmac("sha256", key).update(encoded).digest("base64url");
  const actualBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PublicRsvpToken;
    if (!value.eventId || !value.slug || !Number.isSafeInteger(value.expiresAt) || value.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return value;
  } catch {
    return null;
  }
}
