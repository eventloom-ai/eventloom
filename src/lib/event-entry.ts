import { formatBriefDateTime } from "@/lib/agent/brief-facts";
import { MAX_BRIEF_CHARS } from "@/lib/prompt-limits";

const MAX_LANDING_BRIEF_LENGTH = MAX_BRIEF_CHARS;

/** Joins the landing composer's description, event type, date and location into one brief that fits the length cap. */
export function composeLandingBrief({ description, eventTypeLabel, date, location }: { description: string; eventTypeLabel?: string; date?: string; location?: string }) {
  const label = eventTypeLabel?.trim();
  const prefix = label ? `${/\bevent$/i.test(label) ? label : `${label} event`}. ` : "";
  const details = [
    date?.trim() ? `The event is on ${formatBriefDateTime(date)}.` : "",
    location?.trim() ? `It will be held at ${location.trim().replace(/[.\s]+$/, "")}.` : "",
  ].filter(Boolean).join(" ");
  const room = MAX_LANDING_BRIEF_LENGTH - prefix.length - (details ? details.length + 1 : 0) - 1;
  const text = description.trim().slice(0, Math.max(0, room)).trim();
  const body = !details || !text || /[.!?…。؟]["'”’)]*$/.test(text) ? text : `${text}.`;
  return [`${prefix}${body}`.trim(), details].filter(Boolean).join(" ");
}

export function eventDraftPath(brief?: string) {
  const trimmed = brief?.trim().slice(0, MAX_LANDING_BRIEF_LENGTH) ?? "";
  return trimmed
    ? `/app/events/new?brief=${encodeURIComponent(trimmed)}`
    : "/app/events/new";
}

export function eventDraftEntryPath({
  brief,
  authenticated,
  authConfigured = true,
  signupEnabled,
}: {
  brief: string;
  authenticated: boolean;
  authConfigured?: boolean;
  signupEnabled: boolean;
}) {
  const draftPath = eventDraftPath(brief);
  if (authenticated || !authConfigured) return draftPath;
  const authPath = signupEnabled ? "/signup" : "/login";
  return `${authPath}?next=${encodeURIComponent(draftPath)}`;
}
