import { describe, expect, it } from "vitest";
import { enrichBriefWithIntake, type IntakeAnswers } from "@/lib/agent/intake";
import { parseBuildForm } from "@/lib/agent/parse-build-form";
import { creatorErrorMessage } from "@/lib/creator-errors";
import { MAX_BRIEF_CHARS, MAX_INTAKE_ANSWER_CHARS, MAX_PROMPT_CHARS, promptTooLong } from "@/lib/prompt-limits";

describe("prompt length limits", () => {
  it("flags build prompts over the server limit", async () => {
    expect((await parseBuildForm(null, { prompt: "a".repeat(MAX_PROMPT_CHARS), slug: "garden-supper" })).promptTooLong).toBe(false);
    expect((await parseBuildForm(null, { prompt: "a".repeat(MAX_PROMPT_CHARS + 1), slug: "garden-supper" })).promptTooLong).toBe(true);
    expect(promptTooLong(` ${"a".repeat(MAX_PROMPT_CHARS)} `)).toBe(false);
  });

  it("fits a full-length brief plus every intake answer under the limit", () => {
    const answers: IntakeAnswers = Object.fromEntries(["eventName", "dateAndTime", "dateTiming", "venueType", "venue", "mensHall", "womensHall", "languages"].map((key) => [key, "x".repeat(MAX_INTAKE_ANSWER_CHARS)]));
    expect(promptTooLong(enrichBriefWithIntake("b".repeat(MAX_BRIEF_CHARS), answers))).toBe(false);
  });

  it("explains the limit to the creator", () => {
    expect(creatorErrorMessage("prompt_too_long")).toBe("That description is too long. Keep it under 4,000 characters, then try again.");
  });
});
