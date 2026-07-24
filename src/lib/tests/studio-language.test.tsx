import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudioChat } from "@/components/studio-chat";
import { StudioToolbar } from "@/components/studio-toolbar";

describe("nontechnical studio language", () => {
  it("keeps the main toolbar focused on creator actions", () => {
    const html = renderToStaticMarkup(
      <StudioToolbar
        eventId="10000000-0000-4000-8000-000000000001"
        title="Maya & Adam"
        status="published"
        saveStatus="saved"
        viewport="desktop"
        canUndo={false}
        canRedo={false}
        onViewport={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onToggleHistory={vi.fn()}
      />,
    );

    expect(html).toContain("Published · All changes saved");
    expect(html).toContain('aria-label="Send feedback"');
    expect(html).not.toContain("Inspect generated source");
  });

  it("invites plain-language changes without developer terminology", () => {
    const html = renderToStaticMarkup(
      <StudioChat
        messages={[]}
        value=""
        isRunning={false}
        activity=""
        error=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onStop={vi.fn()}
        onClearSelection={vi.fn()}
        onAttachment={vi.fn()}
      />,
    );

    expect(html).toContain("Ask Eventloom");
    expect(html).toContain("change in your own words");
    expect(html).toContain("page is ready to personalize");
    expect(html).not.toContain("Eventloom agent");
    expect(html).not.toContain("canvas");
  });
});
