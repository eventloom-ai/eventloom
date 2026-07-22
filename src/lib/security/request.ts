import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

export function isSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function requestWithinLimit(request: NextRequest, maxBytes: number) {
  const raw = request.headers.get("content-length");
  if (!raw) return true;
  const length = Number(raw);
  return Number.isFinite(length) && length >= 0 && length <= maxBytes;
}

export async function readJsonWithinLimit<T = unknown>(request: Request, maxBytes: number) {
  const declared = request.headers.get("content-length");
  if (declared && (!Number.isFinite(Number(declared)) || Number(declared) < 0 || Number(declared) > maxBytes)) {
    return { ok: false as const, error: "payload_too_large" as const };
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) return { ok: false as const, error: "payload_too_large" as const };
  try {
    return { ok: true as const, data: JSON.parse(new TextDecoder().decode(bytes)) as T };
  } catch {
    return { ok: false as const, error: "invalid_json" as const };
  }
}

export function keyedHash(value: string) {
  const secret = env.ipHashSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function safeTokenEquals(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function clientIpHash(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim();
  return ip ? keyedHash(ip) : null;
}
