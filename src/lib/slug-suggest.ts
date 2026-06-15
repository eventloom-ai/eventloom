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
  return slug.length >= 3 ? slug : "";
}

export function normalizeSlugInput(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}
