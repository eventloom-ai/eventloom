import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivatePreviewToolbar } from "@/components/private-preview-toolbar";

describe("private creator preview", () => {
  it("provides a clear return to the owning event studio", () => {
    const html = renderToStaticMarkup(
      <PrivatePreviewToolbar
        eventId="00000000-0000-4000-8000-000000000123"
        status="draft"
      />,
    );

    expect(html).toContain(
      'href="/app/events/00000000-0000-4000-8000-000000000123/studio"',
    );
    expect(html).toContain("Back to studio");
    expect(html).toContain("Private preview");
    expect(html).toContain("Only you can see this draft.");
  });
});
