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
