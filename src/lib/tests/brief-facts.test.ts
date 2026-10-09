import { describe, expect, it } from "vitest";
import { defaultEventConfig } from "@/lib/ai/generator";
import { briefFacts, formatBriefDateTime } from "@/lib/agent/brief-facts";
import { groundConfigInPrompt } from "@/lib/agent/generate-config";
import { intakeQuestionsForBrief } from "@/lib/agent/intake";
import { composeLandingBrief, eventDraftPath } from "@/lib/event-entry";

describe("brief facts", () => {
  it("formats a datetime-local value for people", () => {
    expect(formatBriefDateTime("2026-11-21T19:30")).toBe("Saturday, November 21, 2026 at 7:30 PM");
    expect(formatBriefDateTime("2026-06-06")).toBe("Saturday, June 6, 2026");
    expect(formatBriefDateTime("soon")).toBe("soon");
  });

  it("reads ISO datetimes with no boundary before the T, plus written dates, times and venues", () => {
    expect(briefFacts("Party on 2026-06-06T18:30 with friends")).toEqual({ date: "Saturday, June 6, 2026", time: "6:30 PM" });
    expect(briefFacts("The event is on Saturday, November 21, 2026 at 7:30 PM. It will be held at The Grand Hall.")).toEqual({ date: "Saturday, November 21, 2026", time: "7:30 PM", venue: "The Grand Hall" });
    expect(briefFacts("Dinner 21st March, doors 19:00\n- Venue: Rooftop Bar")).toEqual({ date: "March 21", time: "7:00 PM", venue: "Rooftop Bar" });
    expect(briefFacts("A cozy autumn birthday with amazing food")).toEqual({});
  });
});

describe("landing brief", () => {
  it("joins details as separate sentences with a readable date", () => {
    expect(composeLandingBrief({ description: "A rooftop dinner for Sam", eventTypeLabel: "Birthday", date: "2026-11-21T19:30", location: "Sky Bar" }))
      .toBe("Birthday event. A rooftop dinner for Sam. The event is on Saturday, November 21, 2026 at 7:30 PM. It will be held at Sky Bar.");
    expect(composeLandingBrief({ description: "Quarterly offsite!", eventTypeLabel: "Corporate event" })).toBe("Corporate event. Quarterly offsite!");
  });

  it("truncates the description, not the appended details, for long briefs", () => {
    const brief = composeLandingBrief({ description: "x".repeat(2_500), date: "2026-11-21T19:30", location: "Sky Bar" });
    expect(brief.length).toBeLessThanOrEqual(2_000);
    expect(brief.endsWith("The event is on Saturday, November 21, 2026 at 7:30 PM. It will be held at Sky Bar.")).toBe(true);
    expect(decodeURIComponent(eventDraftPath(brief).split("brief=")[1] ?? "")).toBe(brief);
  });
});

describe("brief-aware intake and grounding", () => {
  const brief = "Wedding event. Our garden wedding. The event is on Saturday, November 21, 2026 at 7:30 PM. It will be held at The Grand Hall.";

  it("skips intake questions the brief already answers", () => {
    expect(intakeQuestionsForBrief(brief).map((question) => question.id)).toEqual(["eventName", "venueType"]);
    expect(intakeQuestionsForBrief("Wedding event. 2026-11-21").map((question) => question.id)).toEqual(["eventName", "dateTiming", "venueType", "venue"]);
  });

  it("carries a known start time onto the main schedule item", () => {
    const iso = "Birthday event. Dinner. The event date is 2026-11-21T19:30.";
    const grounded = groundConfigInPrompt({ ...defaultEventConfig(iso), date: "November 21, 2026 at 7:30 PM", schedule: [{ title: "Dinner", time: "Time to be announced" }, { title: "Cake", time: "Time to be announced" }] }, iso);
    expect(grounded.date).toBe("November 21, 2026 at 7:30 PM");
    expect(grounded.schedule.map((item) => item.time)).toEqual(["7:30 PM", "Time to be announced"]);
  });

  it("fills the fallback plan from the brief without treating the time as a venue", () => {
    const fallback = defaultEventConfig(brief);
    expect(fallback.date).toBe("Saturday, November 21, 2026 at 7:30 PM");
    expect(fallback.venueName).toBe("The Grand Hall");
    expect(fallback.schedule[0]?.time).toBe("7:30 PM");

    const noVenue = "Birthday event. The event is on Saturday, November 21, 2026 at 7:30 PM.";
    expect(groundConfigInPrompt({ ...defaultEventConfig(noVenue), venueName: "Invented Ballroom" }, noVenue).venueName).toBe("Venue to be announced");
  });
});
