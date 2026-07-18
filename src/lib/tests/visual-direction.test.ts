import { describe, expect, it } from "vitest";
import { enrichPromptWithTheme } from "@/lib/agent/parse-build-form";
import { visualDirectionForMood } from "@/lib/event-theme";

describe("visual direction", () => {
  it("turns a studio selection into a concrete composition brief", () => {
    const prompt = enrichPromptWithTheme("A wedding site with guest replies.", { mood: "forest" });

    expect(prompt).toContain("organic garden editorial");
    expect(prompt).toContain("Create an original composition");
  });

  it("provides distinct direction language for every visual choice", () => {
    expect(visualDirectionForMood("blush")).not.toBe(visualDirectionForMood("navy"));
    expect(visualDirectionForMood("sunset")).toContain("graphic celebration");
  });
});
