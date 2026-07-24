import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { legalContactEmail: () => "privacy@eventloom.invalid" },
}));

import ContactPage from "@/app/contact/page";
import {
  FEEDBACK_OPEN_EVENT,
  requestFeedbackDialog,
  takePendingFeedbackDialogRequest,
} from "@/lib/feedback";

describe("contact support", () => {
  it("offers the private feedback queue without exposing internal launch configuration", () => {
    const html = renderToStaticMarkup(<ContactPage />);

    expect(html).toContain("Send a support message");
    expect(html).toContain("private feedback queue");
    expect(html).not.toContain("must be configured before public payments");
    expect(html).not.toContain("privacy@eventloom.invalid");
  });

  it("dispatches the shared event used by the global feedback dialog", () => {
    const dispatchEvent = vi.fn();

    requestFeedbackDialog({ dispatchEvent });

    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0]?.[0]).toBeInstanceOf(Event);
    expect((dispatchEvent.mock.calls[0]?.[0] as Event).type).toBe(FEEDBACK_OPEN_EVENT);
    expect(takePendingFeedbackDialogRequest()).toBe(true);
    expect(takePendingFeedbackDialogRequest()).toBe(false);
  });
});
