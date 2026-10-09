import { isReservedSlug } from "@/lib/reserved-slugs";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "your",
  "our",
  "my",
  "event",
  "site",
  "page",
  "that",
  "this",
  "from",
  "into",
  "about",
  "have",
  "has",
  "will",
  "would",
  "should",
  "could",
  "english",
  "spanish",
  "arabic",
  "bilingual",
  "luxury",
  "modern",
  "elegant",
  "beautiful",
  "custom",
  "soft",
  "bold",
]);

export function suggestSlug(value: string) {
  const words = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 3);

  const slug = words.join("-").replace(/-+/g, "-").slice(0, 32).replace(/-+$/g, "");
  if (slug.length < 3) return "";
  return isReservedSlug(slug) ? `${slug}-event` : slug;
}

/** A stable `event-xxxxxx` address for briefs with no usable ASCII words (e.g. Arabic); stable so SSR and hydration agree. */
export function fallbackSlug(brief: string) {
  let hash = 2166136261;
  for (const char of brief.trim()) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619) >>> 0;
  return `event-${hash.toString(36).padStart(6, "0").slice(-6)}`;
}

export function suggestSlugOrFallback(brief: string) {
  return suggestSlug(brief) || (brief.trim() ? fallbackSlug(brief) : "");
}

/** Lenient normalization while typing: keeps a trailing hyphen so "my-" can become "my-event". */
export function normalizeSlugTyping(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/g, "")
    .slice(0, 63);
}

/** Final normalization for blur and submit. */
export function normalizeSlugInput(value: string) {
  return normalizeSlugTyping(value).replace(/-+$/g, "");
}
