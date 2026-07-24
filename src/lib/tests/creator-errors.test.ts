import { describe, expect, it } from "vitest";
import { creatorErrorMessage } from "@/lib/creator-errors";

describe("creator error guidance", () => {
  it("turns workspace failures into reassuring next steps", () => {
    expect(creatorErrorMessage("create_event_failed")).toBe(
      "We couldn’t create the workspace. Nothing was charged—please try again.",
    );
    expect(creatorErrorMessage("network_error")).toContain("Check your connection");
  });

  it("explains recoverable studio conflicts without exposing codes", () => {
    const message = creatorErrorMessage("version_conflict");

    expect(message).toContain("newest version");
    expect(message).not.toContain("version_conflict");
  });

  it("keeps AI-credit exhaustion understandable and non-destructive", () => {
    const message = creatorErrorMessage("ai_credit_limit_reached");

    expect(message).toContain("draft is safe");
    expect(message).toContain("direct editing still works");
  });

  it("uses a caller-specific fallback for unknown server failures", () => {
    expect(creatorErrorMessage("database_code_123", "Your draft is unchanged.")).toBe(
      "Your draft is unchanged.",
    );
  });
});
