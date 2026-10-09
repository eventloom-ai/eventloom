const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const WEEKDAY = "(?:mon|tues|wednes|thurs|fri|satur|sun)day";

const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?(?!\d)/;
const MONTH_FIRST_DATE = new RegExp(`\\b(?:${WEEKDAY},?\\s+)?(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i");
const DAY_FIRST_DATE = new RegExp(`\\b(?:${WEEKDAY},?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH})\\.?(?:,?\\s+(\\d{4}))?\\b`, "i");
const MERIDIEM_TIME = /\b((?:1[0-2]|0?[1-9]))(?::([0-5]\d))?\s*([ap])\.?\s?m\b\.?/i;
const CLOCK_TIME = /(?:\b|T)((?:[01]\d|2[0-3])):([0-5]\d)\b/;
const NAMED_TIME = /\b(noon|midnight)\b/i;
const VENUE = /\b(?:held at|taking place at|takes place at|hosted at|venue(?:\s+is|:)|location(?:\s+is|:))\s+([^\n]+?)(?=\.\s|\.?$|\n)/im;

export type BriefFacts = { date?: string; time?: string; venue?: string };

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

function monthIndex(value: string) {
  return MONTHS.findIndex((month) => month.toLowerCase().startsWith(value.toLowerCase().slice(0, 3)));
}

export function formatClockTime(hours: number, minutes: number) {
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

function formatDay(year: number, month: number, day: number) {
  const date = validDate(year, month, day);
  return date ? `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[month - 1]} ${day}, ${year}` : null;
}

/** Formats a date or datetime-local value ("2026-11-21T19:30") for a human-readable brief. */
export function formatBriefDateTime(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return value.trim();
  const day = formatDay(Number(match[1]), Number(match[2]), Number(match[3]));
  if (!day) return value.trim();
  return match[4] ? `${day} at ${formatClockTime(Number(match[4]), Number(match[5]))}` : day;
}

function briefDate(prompt: string) {
  const iso = prompt.match(ISO_DATE);
  if (iso) {
    const day = formatDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (day) return { date: day, time: iso[4] ? formatClockTime(Number(iso[4]), Number(iso[5])) : undefined };
  }
  const monthFirst = prompt.match(MONTH_FIRST_DATE);
  const dayFirst = prompt.match(DAY_FIRST_DATE);
  const [monthName, dayValue, yearValue] = monthFirst ? [monthFirst[1], monthFirst[2], monthFirst[3]] : dayFirst ? [dayFirst[2], dayFirst[1], dayFirst[3]] : [];
  if (!monthName || !dayValue) return {};
  const month = monthIndex(monthName) + 1;
  const day = Number(dayValue);
  if (!month || day < 1 || day > 31) return {};
  return { date: yearValue ? formatDay(Number(yearValue), month, day) ?? undefined : `${MONTHS[month - 1]} ${day}` };
}

function briefTime(prompt: string) {
  const meridiem = prompt.match(MERIDIEM_TIME);
  if (meridiem) return formatClockTime((Number(meridiem[1]) % 12) + (meridiem[3].toLowerCase() === "p" ? 12 : 0), Number(meridiem[2] ?? 0));
  const clock = prompt.replace(ISO_DATE, " ").match(CLOCK_TIME);
  if (clock) return formatClockTime(Number(clock[1]), Number(clock[2]));
  const named = prompt.match(NAMED_TIME);
  return named ? named[1].toLowerCase() === "noon" ? "12:00 PM" : "12:00 AM" : undefined;
}

/** Facts the customer stated explicitly in a brief: a calendar date, a start time, and a named venue. */
export function briefFacts(prompt: string): BriefFacts {
  const { date, time: isoTime } = briefDate(prompt);
  const time = isoTime ?? briefTime(prompt);
  const venue = prompt.match(VENUE)?.[1]?.trim().replace(/[.,;]+$/, "");
  return { ...(date ? { date } : {}), ...(time ? { time } : {}), ...(venue ? { venue } : {}) };
}
