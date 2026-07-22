import { describe, expect, it, vi } from "vitest";
import { reportOperationalEvent } from "@/lib/monitoring";

describe("privacy-scrubbed operational monitoring", () => {
  it("drops personal and secret fields before logging", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    reportOperationalEvent("info", "test", { eventId: "event-1", email: "guest@example.com", token: "secret", prompt: "private" });
    const payload = String(log.mock.calls[0]?.[0]);
    expect(payload).toContain("event-1");
    expect(payload).not.toContain("guest@example.com");
    expect(payload).not.toContain("secret");
    expect(payload).not.toContain("private");
    log.mockRestore();
  });
});
