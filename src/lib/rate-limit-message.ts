// Client-safe wording for `rate_limited` (429) answers; the server sends `retryAfterSeconds`.

export function retryAfterPhrase(retryAfterSeconds?: number | null) {
  const seconds = Number(retryAfterSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return "in a few minutes";
  if (seconds <= 60) return "in a minute";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 120) return `in ${minutes} minutes`;
  return `in about ${Math.round(minutes / 60)} hours`;
}

export function rateLimitedMessage(retryAfterSeconds?: number | null) {
  return `You’re doing that too quickly — try again ${retryAfterPhrase(retryAfterSeconds)}.`;
}

/** Reads the retry hint from a parsed error body, if the server sent one. */
export function retryAfterFrom(payload: unknown) {
  const value = (payload as { retryAfterSeconds?: unknown } | null)?.retryAfterSeconds;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
