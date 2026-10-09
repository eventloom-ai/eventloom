"use client";

import { useSyncExternalStore } from "react";

// Marketing pages are static, so the signed-in state is read from the Supabase session cookie in the browser.
// A stale cookie only changes labels and links; /app still verifies the session and redirects to login.
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

export function hasSessionCookie(cookie: string) {
  return SESSION_COOKIE.test(cookie);
}

export function useSignedIn() {
  return useSyncExternalStore(() => () => undefined, () => hasSessionCookie(document.cookie), () => false);
}
