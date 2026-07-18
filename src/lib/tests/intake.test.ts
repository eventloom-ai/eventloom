import { describe, expect, it } from "vitest";
import { enrichBriefWithIntake, intakeQuestionsForBrief } from "@/lib/agent/intake";

describe("event intake", () => {
  const brief = "A luxury bilingual wedding site with separate men's and women's hall details and a soft blush design.";

  it("asks for event essentials plus the requested separate halls and languages", () => {
    expect(intakeQuestionsForBrief(brief).map((question) => question.id)).toEqual([
      "eventName",
      "dateAndTime",
      "dateTiming",
      "venueType",
      "venue",
      "mensHall",
      "womensHall",
      "languages",
    ]);
  });

  it("adds only customer-confirmed details to the generation brief", () => {
    expect(enrichBriefWithIntake(brief, { eventName: "Amina & Kareem", venue: "The Crescent Pavilion" })).toContain(
      "Details confirmed by the customer:\n- Event name: Amina & Kareem\n- Venue: The Crescent Pavilion",
    );
  });
});
