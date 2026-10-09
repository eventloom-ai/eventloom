import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import type { EventDesign } from "@/lib/event-design/schema";
import { composeSiteDocument } from "@/lib/site-document";
import type { EventConfig } from "@/lib/types";

const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
const design: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "blush", content: wedding.content };
const document = composeSiteDocument(wedding.config, "", (prefix) => `${prefix}_node`);

const mocks = vi.hoisted(() => ({ config: null as unknown as EventConfig, commit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getServerUser: async () => ({ id: "owner-1" }), serviceSupabase: () => null }));
vi.mock("@/lib/studio-store", () => ({
  canEditEvent: async () => true,
  loadStudioState: async () => ({ revision: { id: "version-1", config: mocks.config, document, prompt: "Amina and Kareem's wedding. Use the forest color palette." } }),
  commitStudioRevision: mocks.commit,
}));

import { PATCH } from "@/app/api/events/[eventId]/studio/route";

const patch = (body: Record<string, unknown>) => PATCH(
  new NextRequest("https://eventloom.test/api/events/event-1/studio", { method: "PATCH", headers: { origin: "https://eventloom.test", host: "eventloom.test", "content-type": "application/json" }, body: JSON.stringify({ baseVersionId: "version-1", ...body }) }),
  { params: Promise.resolve({ eventId: "event-1" }) },
);

describe("studio autosave for designed events", () => {
  beforeEach(() => {
    mocks.config = { ...wedding.config, design };
    mocks.commit.mockReset();
    mocks.commit.mockImplementation(async (input) => ({ ok: true, revision: { id: "version-2", config: input.config, document: input.document } }));
  });

  it("saves the design and event details on the config and keeps the stored document", async () => {
    const next: EventDesign = { ...design, styleKey: "noir", paletteKey: "gilded", content: { ...design.content, rsvpHeading: "Kindly reply" } };
    const response = await patch({ design: next, eventPatch: { title: "Amina & Kareem, together" } });
    expect(response.status).toBe(200);
    const committed = mocks.commit.mock.calls[0][0];
    expect(committed.config.design).toEqual(next);
    expect(committed.config.title).toBe("Amina & Kareem, together");
    expect(committed.document).toEqual(document);
  });

  it("rejects a design outside the closed sets without saving", async () => {
    const response = await patch({ design: { ...design, paletteKey: "cobalt" } });
    expect(response.status).toBe(422);
    expect(mocks.commit).not.toHaveBeenCalled();
  });

  it("keeps the design through a details-only edit", async () => {
    await patch({ eventPatch: { venueName: "The Orchard" } });
    expect(mocks.commit.mock.calls[0][0].config).toMatchObject({ venueName: "The Orchard", design });
  });

  it("moves a legacy event onto the design system from its own details when asked", async () => {
    mocks.config = { ...wedding.config, theme: { ...wedding.config.theme, mood: "" } };
    const response = await patch({ adoptDesign: true });
    expect(response.status).toBe(200);
    const adopted = mocks.commit.mock.calls[0][0].config.design;
    expect(adopted).toMatchObject({ version: 1, styleKey: "romantic", paletteKey: "sage", content: {} });
  });

  it("does not replace an existing design when asked to adopt one", async () => {
    await patch({ adoptDesign: true });
    expect(mocks.commit.mock.calls[0][0].config.design).toEqual(design);
  });
});
