import { describe, expect, it } from "vitest";
import { optionalFormString } from "@/lib/form-values";

describe("optionalFormString", () => {
  it("normalizes an omitted form control to an empty string", () => {
    expect(optionalFormString(null)).toBe("");
  });

  it("preserves a submitted string value", () => {
    expect(optionalFormString("guest@example.com")).toBe("guest@example.com");
  });
});
