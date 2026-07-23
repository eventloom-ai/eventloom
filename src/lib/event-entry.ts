const MAX_LANDING_BRIEF_LENGTH = 2_000;

export function eventDraftPath(brief?: string) {
  const trimmed = brief?.trim().slice(0, MAX_LANDING_BRIEF_LENGTH) ?? "";
  return trimmed
    ? `/app/events/new?brief=${encodeURIComponent(trimmed)}`
    : "/app/events/new";
}

export function eventDraftEntryPath({
  brief,
  authenticated,
  signupEnabled,
}: {
  brief: string;
  authenticated: boolean;
  signupEnabled: boolean;
}) {
  const draftPath = eventDraftPath(brief);
  if (authenticated) return draftPath;
  const authPath = signupEnabled ? "/signup" : "/login";
  return `${authPath}?next=${encodeURIComponent(draftPath)}`;
}
