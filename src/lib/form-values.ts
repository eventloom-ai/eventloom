export function optionalFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}
