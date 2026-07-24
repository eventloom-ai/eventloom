import { describe, expect, it } from "vitest";
import { safeCsvCell } from "@/lib/csv";

describe("safe CSV cells", () => {
  it("escapes quotes", () => {
    expect(safeCsvCell('Dinner "notes"')).toBe('"Dinner ""notes"""');
  });

  it.each(["=1+1", "+SUM(A1:A2)", "-2+3", "@IMPORTDATA(\"https://example.com\")", "  =cmd"])(
    "neutralizes spreadsheet formulas in %s",
    (value) => {
      expect(safeCsvCell(value)).toBe(`"'${value.replaceAll('"', '""')}"`);
    },
  );
});
