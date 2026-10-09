const COUPLE_EVENT = /wedding|engagement|anniversary|nikah|nikkah|katb|vow renewal|elopement|couple|زفاف|خطوبة|عرس/i;

/** Couple titles ("Amina & Kareem") are stacked over an ampersand; any other title ("Rock and Roll Night") stays on one line. */
export function coupleTitleLines(title: string, eventType: string) {
  if (!COUPLE_EVENT.test(eventType)) return null;
  const parts = title.split(/\s*&\s*|\s+and\s+/i).map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? parts as [string, string] : null;
}
