import "server-only";

import { env, isTurnstileConfigured } from "@/lib/env";
import type { TurnstileAction } from "@/lib/security/turnstile-shared";

type TurnstileResult = { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };

type VerifyTurnstileOptions = {
  expectedAction: TurnstileAction;
  expectedHostname: string;
  remoteIp?: string;
};

function normalizedHostname(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export async function verifyTurnstile(
  token: string,
  { expectedAction, expectedHostname, remoteIp }: VerifyTurnstileOptions,
) {
  if (!isTurnstileConfigured()) return process.env.NODE_ENV !== "production";
  if (!token || !expectedHostname) return false;
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
    return response.ok
      && result.success === true
      && result.action === expectedAction
      && normalizedHostname(result.hostname ?? "") === normalizedHostname(expectedHostname);
  } catch {
    return false;
  }
}
