import { describe, expect, it } from "vitest";
import { creatorErrorMessage } from "@/lib/creator-errors";
import { rsvpErrorMessage } from "@/lib/form-values";
import { publishErrorPresentation } from "@/lib/publish-errors";
import { rateLimitedMessage, retryAfterFrom, retryAfterPhrase } from "@/lib/rate-limit-message";

describe("rate-limited messages", () => {
  it("turns Retry-After seconds into a friendly wait", () => {
    expect(retryAfterPhrase(undefined)).toBe("in a few minutes");
    expect(retryAfterPhrase(0)).toBe("in a few minutes");
    expect(retryAfterPhrase(12)).toBe("in a minute");
    expect(retryAfterPhrase(60)).toBe("in a minute");
    expect(retryAfterPhrase(61)).toBe("in 2 minutes");
    expect(retryAfterPhrase(1_740)).toBe("in 29 minutes");
    expect(retryAfterPhrase(20 * 60 * 60)).toBe("in about 20 hours");
    expect(rateLimitedMessage(600)).toBe("You’re doing that too quickly — try again in 10 minutes.");
  });

  it("reads the hint only when the server sent a number", () => {
    expect(retryAfterFrom({ retryAfterSeconds: 30 })).toBe(30);
    expect(retryAfterFrom({ retryAfterSeconds: "30" })).toBeNull();
    expect(retryAfterFrom(null)).toBeNull();
  });

  it("is used by the studio, uploader, publish and RSVP error mappers", () => {
    expect(creatorErrorMessage("rate_limited", "fallback", 300)).toBe("You’re doing that too quickly — try again in 5 minutes.");
    expect(creatorErrorMessage("rate_limited")).toContain("in a few minutes");
    expect(creatorErrorMessage("rate_limit_unavailable")).toContain("draft is safe");
    expect(publishErrorPresentation("rate_limited", "event-1", 3_600).message).toContain("try again in 60 minutes");
    expect(rsvpErrorMessage("rate_limited", 120)).toBe("Too many replies were sent from this connection. Please try again in 2 minutes.");
  });
});
