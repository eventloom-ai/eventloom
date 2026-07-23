import { describe, expect, it } from "vitest";
import { eventDraftEntryPath, eventDraftPath } from "@/lib/event-entry";

describe("event entry routing", () => {
  it("preserves a visitor's event description through signup", () => {
    const entry = eventDraftEntryPath({
      brief: "  A warm garden wedding  ",
      authenticated: false,
      signupEnabled: true,
    });

    expect(entry).toBe(
      "/signup?next=%2Fapp%2Fevents%2Fnew%3Fbrief%3DA%2520warm%2520garden%2520wedding",
    );
  });

  it("uses sign in for an invited beta without losing the description", () => {
    const entry = eventDraftEntryPath({
      brief: "Birthday dinner & dancing",
      authenticated: false,
      signupEnabled: false,
    });

    expect(entry).toBe(
      "/login?next=%2Fapp%2Fevents%2Fnew%3Fbrief%3DBirthday%2520dinner%2520%2526%2520dancing",
    );
  });

  it("takes an authenticated creator directly to the draft", () => {
    expect(eventDraftEntryPath({
      brief: "Engagement party",
      authenticated: true,
      signupEnabled: false,
    })).toBe("/app/events/new?brief=Engagement%20party");
  });

  it("builds the empty draft path without a dangling query", () => {
    expect(eventDraftPath()).toBe("/app/events/new");
  });
});
