import type { EventScheduleItem } from "@/lib/types";

/**
 * EventConfig.date is free text ("Saturday, June 12, 2027 · 4:00 PM", "Summer 2026", "May 20 – 22, 2026").
 * Sections need the pieces separately so the date and time can be set large, so this pulls out what it can
 * and always keeps the original wording as a fallback that is shown verbatim.
 */
export type EventDateParts = {
  /** The host's original wording, never empty. */
  raw: string;
  /** The date without the time ("Saturday, September 19, 2026"). */
  dateLabel: string;
  /** "4:30 PM", from the date text or, failing that, the first timed schedule item. */
  time?: string;
  weekday?: string;
  month?: string;
  monthShort?: string;
  /** "19", or "20–22" for a multi-day range. */
  day?: string;
  year?: string;
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MONTH_PATTERN = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const WEEKDAY_PATTERN = "(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\\.?,?";
const TIME_12H = /\b\d{1,2}(?::\d{2})?\s?[ap]\.?m\.?(?:\s*[–-]\s*\d{1,2}(?::\d{2})?\s?[ap]\.?m\.?)?/i;
const TIME_24H = /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

function normalizeTime(value: string) {
  return value.replace(/\s*([ap])\.?m\.?/gi, (_, letter: string) => ` ${letter.toUpperCase()}M`).replace(/\s*[–-]\s*/g, " – ").trim();
}

export function findTime(text: string) {
  const match = text.match(TIME_12H) ?? text.match(TIME_24H);
  return match ? { text: match[0], time: normalizeTime(match[0]) } : null;
}

/** "Wed · 2:00 PM" → { day: "Wed", time: "2:00 PM" }; "4:30 PM" → { time: "4:30 PM" }. */
export function splitScheduleTime(value: string): { day?: string; time: string } {
  const match = value.match(/^(.+?)\s*[·|,]\s*(\d.*)$/);
  if (match && !findTime(match[1])) return { day: match[1].trim(), time: match[2].trim() };
  return { time: value.trim() };
}

export function parseEventDate(raw: string, schedule: EventScheduleItem[] = []): EventDateParts {
  const text = raw.trim() || "Date to be announced";
  const found = findTime(text);
  const scheduleTime = schedule.map((item) => findTime(item.time)).find(Boolean);
  const dateLabel = found
    ? text.replace(found.text, "").replace(/\s*(?:·|\||@|—|,|\bat\b|\bfrom\b)\s*$/i, "").replace(/\s{2,}/g, " ").trim() || text
    : text;

  const after = new RegExp(`${MONTH_PATTERN}\\s+(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?(?:\\s*[–-]\\s*(?:${WEEKDAY_PATTERN}\\s*)?(?:${MONTH_PATTERN}\\s+)?(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?)?`, "i").exec(dateLabel);
  const before = after ? null : new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*[–-]\\s*(\\d{1,2})(?:st|nd|rd|th)?)?\\s+(?:of\\s+)?${MONTH_PATTERN}`, "i").exec(dateLabel);
  const monthToken = after?.[1] ?? before?.[3];
  const monthIndex = monthToken ? MONTHS.findIndex((month) => month.startsWith(monthToken.toLowerCase().replace(".", "").slice(0, 3))) : -1;
  const firstDay = after?.[2] ?? before?.[1];
  const lastDay = after?.[4] ?? before?.[2];
  const year = dateLabel.match(/\b(?:19|20)\d{2}\b/)?.[0];
  const weekdayToken = new RegExp(`\\b(${WEEKDAY_PATTERN.replace(",?", "")})`, "i").exec(dateLabel)?.[1];
  const weekday = weekdayToken && !lastDay ? WEEKDAYS.find((day) => day.startsWith(weekdayToken.toLowerCase().slice(0, 3))) : undefined;

  return {
    raw: text,
    dateLabel,
    time: found?.time ?? scheduleTime?.time,
    weekday: weekday ? capitalize(weekday) : undefined,
    month: monthIndex >= 0 ? capitalize(MONTHS[monthIndex]) : undefined,
    monthShort: monthIndex >= 0 ? capitalize(MONTHS[monthIndex]).slice(0, 3) : undefined,
    day: firstDay ? (lastDay && lastDay !== firstDay ? `${Number(firstDay)}–${Number(lastDay)}` : String(Number(firstDay))) : undefined,
    year,
  };
}
