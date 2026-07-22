import "server-only";

import { env, isTurnstileConfigured } from "@/lib/env";

type TurnstileResult = { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };

export async function verifyTurnstile(token: string, remoteIp?: string) {
  if (!isTurnstileConfigured()) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  const form = new URLSearchParams({ secret: env.turnstileSecretKey(), response: token });
  if (remoteIp) form.set("remoteip", remoteIp);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    const result = (await response.json()) as TurnstileResult;
    return response.ok && result.success === true;
  } catch {
    return false;
  }
}
