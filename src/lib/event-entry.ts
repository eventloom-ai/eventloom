const MAX_LANDING_BRIEF_LENGTH = 2_000;

export function eventDraftPath(brief?: string, referral?: string) {
  const trimmed = brief?.trim().slice(0, MAX_LANDING_BRIEF_LENGTH) ?? "";
  const query: string[] = [];
  if (trimmed) query.push(`brief=${encodeURIComponent(trimmed)}`);
  if (referral?.trim()) query.push(`ref=${encodeURIComponent(referral.trim().slice(0, 4_096))}`);
  const value = query.join("&");
  return value ? `/app/events/new?${value}` : "/app/events/new";
}

export function eventDraftEntryPath({
  brief,
  authenticated,
  signupEnabled,
  referral,
}: {
  brief: string;
  authenticated: boolean;
  signupEnabled: boolean;
  referral?: string;
}) {
  const draftPath = eventDraftPath(brief, referral);
  if (authenticated) return draftPath;
  const authPath = signupEnabled ? "/signup" : "/login";
  return `${authPath}?next=${encodeURIComponent(draftPath)}`;
}

export function referralJourneyFromPath(path: string) {
  try {
    const url = new URL(path, "https://eventloom.invalid");
    return url.searchParams.get("ref")?.slice(0, 4_096) ?? "";
  } catch {
    return "";
  }
}
