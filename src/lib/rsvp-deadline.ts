import { parseEventDate } from "@/lib/event-design/date";

/**
 * EventConfig.rsvpDeadline is free text the host (or the AI) writes ("June 1, 2027", "1st of May", "2027-06-01",
 * "Please reply before the event"). When it names a calendar day, guests may reply until the end of that day in the
 * event's timezone; that instant is stored on events.rsvp_deadline_at, which the RSVP RPC enforces.
 */
export type RsvpDeadlineDay = { year: number; month: number; day: number };

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NOT_A_DATE = /to be announced|\btba\b|\btbd\b|before the event/i;

function validDay(year: number, month: number, day: number): RsvpDeadlineDay | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { year, month, day } : null;
}

function monthDay(text: string) {
  const parts = parseEventDate(text);
  if (!parts.month || !parts.day) return null;
  // A range ("May 20–22") gives guests until its last day.
  const day = Number(parts.day.split("–").at(-1));
  return { month: MONTH_NAMES.indexOf(parts.month) + 1, day, year: parts.year ? Number(parts.year) : undefined };
}

/**
 * The calendar day a deadline names, or null when it names none. A deadline without a year takes the event's year,
 * or the year before when that day would fall after the event ("Reply by December 20" for a January 5 party).
 */
export function parseRsvpDeadline(text: string | null | undefined, eventDate?: string | null): RsvpDeadlineDay | null {
  const value = text?.trim() ?? "";
  if (!value || NOT_A_DATE.test(value)) return null;
  const iso = value.match(/\b((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return validDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const found = monthDay(value);
  if (!found) return null;
  if (found.year) return validDay(found.year, found.month, found.day);
  const event = eventDate ? monthDay(eventDate) : null;
  if (!event?.year) return null;
  const afterEvent = found.month > event.month || (found.month === event.month && found.day > event.day);
  return validDay(afterEvent ? event.year - 1 : event.year, found.month, found.day);
}

function validTimeZone(timeZone: string | null | undefined) {
  if (!timeZone) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone;
  } catch {
    return null;
  }
}

/** Milliseconds the zone's wall clock is ahead of UTC at `instant` (whole seconds). */
function zoneOffset(instant: number, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(instant)
    .map((part) => [part.type, Number(part.value)]));
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wall - Math.floor(instant / 1000) * 1000;
}

/** The last millisecond of `day` in `timeZone` (an IANA name; anything else, or none, means UTC), as an ISO string. */
export function endOfDayInZone(day: RsvpDeadlineDay, timeZone?: string | null) {
  const wall = Date.UTC(day.year, day.month - 1, day.day, 23, 59, 59);
  const zone = validTimeZone(timeZone);
  if (!zone) return new Date(wall + 999).toISOString();
  // Two passes settle the offset on the right side of a DST change that happens that day.
  const first = wall - zoneOffset(wall, zone);
  const instant = wall - zoneOffset(first, zone);
  return new Date(instant + 999).toISOString();
}

/** The timestamp for events.rsvp_deadline_at, or null when the deadline names no day (which clears the column). */
export function rsvpDeadlineTimestamp(text: string | null | undefined, options: { timeZone?: string | null; eventDate?: string | null } = {}) {
  const day = parseRsvpDeadline(text, options.eventDate);
  return day ? endOfDayInZone(day, options.timeZone) : null;
}

export function formatRsvpDeadlineDay(day: RsvpDeadlineDay) {
  return `${MONTH_NAMES[day.month - 1]} ${day.day}, ${day.year}`;
}

/**
 * How a deadline reads on the page: a machine-looking date ("2027-06-01") is written out; the host's own wording is
 * kept otherwise.
 */
export function displayRsvpDeadline(text: string, eventDate?: string | null) {
  const trimmed = text.trim();
  if (!/^\d{4}-\d{1,2}-\d{1,2}(?:[T\s].*)?$/.test(trimmed)) return trimmed;
  const day = parseRsvpDeadline(trimmed, eventDate);
  return day ? formatRsvpDeadlineDay(day) : trimmed;
}

/**
 * Whether guests can still reply, and the day replies closed on once the deadline has passed. `deadlineAt` is
 * events.rsvp_deadline_at (the instant the RSVP RPC enforces); the label prefers the day the host wrote.
 */
export function rsvpDeadlineState(deadlineAt: string | null | undefined, deadlineText?: string | null, eventDate?: string | null, now = Date.now()) {
  const at = deadlineAt ? Date.parse(deadlineAt) : Number.NaN;
  if (!Number.isFinite(at) || at > now) return { passed: false as const };
  const day = parseRsvpDeadline(deadlineText, eventDate);
  const closedOn = day ? formatRsvpDeadlineDay(day) : new Date(at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  return { passed: true as const, closedOn };
}
