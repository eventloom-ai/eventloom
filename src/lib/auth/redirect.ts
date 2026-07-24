/**
 * Returns an internal application path only. Auth redirect targets are user
 * controlled, so never pass them directly to `redirect()` or `router.push()`.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/app") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%2f|%5c/i.test(value)
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://eventloom.invalid");
    return url.origin === "https://eventloom.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Builds the sign-in URL for a protected request while preserving the complete
 * internal destination. Starting from a fresh `/login` URL prevents protected
 * route query parameters from leaking onto the sign-in page itself.
 */
export function loginUrlForProtectedRequest(requestUrl: URL) {
  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("next", `${requestUrl.pathname}${requestUrl.search}`);
  return loginUrl;
}

/**
 * Supabase falls back to its configured Site URL when a requested OAuth
 * redirect is not allow-listed exactly. Recover a code that lands on `/`
 * by forwarding it to the real exchange handler instead of rendering it.
 */
export function authCallbackRecoveryPath(input: {
  code?: string | null;
  next?: string | null;
}) {
  const code = input.code?.trim().slice(0, 4_096);
  if (!code) return null;
  const query = new URLSearchParams({ code });
  const next = safeRedirectPath(input.next, "");
  if (next) query.set("next", next);
  return `/auth/callback?${query.toString()}`;
}
