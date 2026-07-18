import { describe, expect, it } from "vitest";
import { defaultEventConfig } from "@/lib/ai/generator";

describe("default event configuration", () => {
  it("keeps unspecified wedding facts as placeholders and preserves separate halls", () => {
    const config = defaultEventConfig("A luxury bilingual wedding site with separate men's and women's hall details and a soft blush design.");

    expect(config.title).toBe("Wedding celebration");
    expect(config.date).toBe("Date to be announced");
    expect(config.venueName).toBe("Venue to be announced");
    expect(config.schedule.map((item) => item.title)).toEqual(["Men's hall", "Women's hall"]);
    expect(config.schedule.every((item) => item.time === "Time to be announced")).toBe(true);
  });
});
