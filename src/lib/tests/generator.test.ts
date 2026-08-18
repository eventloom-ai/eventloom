import { describe, expect, it } from "vitest";
import { defaultEventConfig } from "@/lib/ai/generator";
import { groundConfigInPrompt } from "@/lib/agent/generate-config";

describe("default event configuration", () => {
  it("keeps unspecified wedding facts as placeholders and preserves separate halls", () => {
    const config = defaultEventConfig("A luxury bilingual wedding site with separate men's and women's hall details and a soft blush design.");

    expect(config.title).toBe("Wedding celebration");
    expect(config.subtitle).toBe("Details to be announced.");
    expect(config.date).toBe("Date to be announced");
    expect(config.venueName).toBe("Venue to be announced");
    expect(config.schedule.map((item) => item.title)).toEqual(["Men's hall", "Women's hall"]);
    expect(config.schedule.every((item) => item.time === "Time to be announced")).toBe(true);
  });

  it("lifts names out of a casual brief", () => {
    const config = defaultEventConfig("Wedding event. i have a wedding of my brother osama and nour");
    expect(config.title).toBe("Osama & Nour");
  });
});

describe("grounding generated facts in the brief", () => {
  it("keeps names that appear in the prompt even without title case", () => {
    const grounded = groundConfigInPrompt({
      ...defaultEventConfig("Wedding event. i have a wedding of my brother osama and nour"),
      title: "Osama & Nour's Wedding",
      subtitle: "A wedding for Osama and Nour.",
    }, "Wedding event. i have a wedding of my brother osama and nour");

    expect(grounded.title).toBe("Osama & Nour's Wedding");
    expect(grounded.date).toBe("Date to be announced");
    expect(grounded.venueName).toBe("Venue to be announced");
  });
});
