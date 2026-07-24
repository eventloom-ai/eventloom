export function safeCsvCell(value: unknown) {
  let raw = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  if (/^[\t\r ]*[=+\-@]/.test(raw)) {
    raw = `'${raw}`;
  }
  return `"${raw.replaceAll('"', '""')}"`;
}
