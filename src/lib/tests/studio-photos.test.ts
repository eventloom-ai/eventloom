import type { Data } from "@puckeditor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { designEventSite } from "@/lib/event-design/design-event-site";
import type { EventDesign } from "@/lib/event-design/schema";
import { designToPuckData, puckDataToDesign, sectionsMissingFromCanvas } from "@/lib/puck-design";
import { puckDataToEventPatch, siteDocumentToPuckData } from "@/lib/puck-document";
import { applyEventDetailsPatch } from "@/lib/site-document-operations";
import { composeSiteDocument } from "@/lib/site-document";
import { createFakeSupabase, type FakeSupabase } from "@/lib/tests/fake-supabase";
import type { EventConfig } from "@/lib/types";

const mocks = vi.hoisted(() => ({ fake: null as unknown as FakeSupabase | null }));
vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => mocks.fake?.client ?? null, getServerUser: async () => null }));

import { syncEventRsvpDeadline } from "@/lib/rsvp-deadline-sync";
import { commitStudioRevision } from "@/lib/studio-store";
import { getLocalDemoEventById, saveLocalDemoEvent } from "@/lib/local-demo-store";

const asset = (n: number) => `/api/assets/00000000-0000-4000-8000-00000000000${n}`;
const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
const base: EventDesign = { version: 1, styleKey: "romantic", paletteKey: "blush", content: wedding.content };
const bare: EventConfig = { ...wedding.config, heroImageUrl: undefined, galleryImageUrls: [], schedule: wedding.config.schedule.slice(0, 1) };

const root = (data: Data) => (data.root as { props: Record<string, unknown> }).props;
const withRoot = (data: Data, props: Record<string, unknown>): Data => ({ ...data, root: { props: { ...root(data), ...props } } } as Data);
const kinds = (config: EventConfig, design: EventDesign) => designEventSite(config, design.styleKey, design.content, { paletteKey: design.paletteKey, sections: design.sections }).sections.map((section) => section.kind);

describe("photos in the designed studio", () => {
  it("shows the cover and gallery photos with their descriptions in the page settings", () => {
    const config: EventConfig = { ...bare, heroImageUrl: asset(1), galleryImageUrls: [asset(2), asset(3)], imageAlts: { [asset(2)]: "The two of us in the orchard" } };
    expect(root(designToPuckData(config, base))).toMatchObject({
      coverPhoto: { url: asset(1), alt: "" },
      galleryPhotos: [{ url: asset(2), alt: "The two of us in the orchard" }, { url: asset(3), alt: "" }],
      rsvpFields: config.rsvpFields,
    });
  });

  it("saves uploads, replacements, removals, reordering and descriptions onto the config the page reads", () => {
    const data = designToPuckData(bare, base);
    const edited = withRoot(data, {
      coverPhoto: { url: asset(1), alt: " Amina and Kareem " },
      galleryPhotos: [{ url: asset(4), alt: "" }, { url: asset(2), alt: "First dance" }, { url: asset(3), alt: "" }],
    });
    const config = applyEventDetailsPatch(bare, puckDataToEventPatch(edited));
    expect(config).toMatchObject({ heroImageUrl: asset(1), galleryImageUrls: [asset(4), asset(2), asset(3)], imageAlts: { [asset(1)]: "Amina and Kareem", [asset(2)]: "First dance" } });

    const site = designEventSite(config, "romantic", base.content);
    const hero = site.sections.find((section) => section.kind === "hero")!.props as { image?: { url: string; alt: string } };
    expect(hero.image).toEqual({ url: asset(1), alt: "Amina and Kareem" });
    const gallery = site.sections.find((section) => section.kind === "gallery")!.props as { images: { url: string; alt: string }[] };
    expect(gallery.images.map((image) => image.url)).toEqual([asset(4), asset(2), asset(3)]);
    expect(gallery.images[1].alt).toBe("First dance");
    expect(gallery.images[0].alt).toBe(`${bare.title}, photo 2`);

    // Removing the cover and a gallery photo clears them, and their descriptions go with them.
    const removed = applyEventDetailsPatch(config, puckDataToEventPatch(withRoot(edited, { coverPhoto: null, galleryPhotos: [{ url: asset(4), alt: "" }] })));
    expect(removed.heroImageUrl).toBeUndefined();
    expect(removed.galleryImageUrls).toEqual([asset(4)]);
    expect(removed.imageAlts).toBeUndefined();
  });

  it("drops photo URLs that are not stored or https photos instead of failing the save, and rejects them from the API", () => {
    const data = withRoot(designToPuckData(bare, base), { coverPhoto: { url: "data:image/png;base64,AAAA", alt: "x" }, galleryPhotos: [{ url: "javascript:alert(1)", alt: "" }, { url: "https://images.example/a.jpg", alt: "" }, { url: "//evil.example/a.jpg", alt: "" }] });
    expect(puckDataToEventPatch(data)).toMatchObject({ heroImageUrl: "", galleryImageUrls: ["https://images.example/a.jpg"], imageAlts: {} });
    expect(() => applyEventDetailsPatch(bare, { heroImageUrl: "data:image/png;base64,AAAA" })).toThrow();
    expect(() => applyEventDetailsPatch(bare, { galleryImageUrls: ["http://images.example/a.jpg"] })).toThrow();
    expect(() => applyEventDetailsPatch(bare, { galleryImageUrls: Array.from({ length: 13 }, (_, index) => `https://images.example/${index}.jpg`) })).toThrow();
  });

  it("shows a section a details edit makes appear instead of hiding it", () => {
    // Two gallery photos: no gallery yet. A third one makes it appear.
    const before: EventConfig = { ...bare, heroImageUrl: asset(1), galleryImageUrls: [asset(2), asset(3)] };
    const data = withRoot(designToPuckData(before, base), { galleryPhotos: [{ url: asset(2), alt: "" }, { url: asset(3), alt: "" }, { url: asset(4), alt: "" }] });
    const after = applyEventDetailsPatch(before, puckDataToEventPatch(data));
    const design = puckDataToDesign(data, base, after, before);
    expect(design.sections?.hidden).toBeUndefined();
    expect(kinds(after, design)).toContain("gallery");
    expect(sectionsMissingFromCanvas(data, after, design)).toEqual(["gallery"]);
    // The same goes for a second schedule item.
    const twoItems = withRoot(designToPuckData(after, design), { schedule: wedding.config.schedule.slice(0, 2) });
    const withSchedule = applyEventDetailsPatch(after, puckDataToEventPatch(twoItems));
    expect(puckDataToDesign(twoItems, design, withSchedule, after).sections?.hidden).toBeUndefined();
    expect(sectionsMissingFromCanvas(twoItems, withSchedule, design)).toEqual(["schedule"]);
    // A section the host removes is still hidden.
    const canvas = designToPuckData(after, design);
    const removed = { ...canvas, content: canvas.content.filter((item) => item.type !== "Gallery") } as Data;
    expect(puckDataToDesign(removed, design, after).sections?.hidden).toEqual(["gallery"]);
    expect(sectionsMissingFromCanvas(removed, after, puckDataToDesign(removed, design, after))).toEqual([]);
  });

  it("edits which questions the RSVP form asks, always keeping name and attendance", () => {
    const data = withRoot(designToPuckData(bare, base), { rsvpFields: ["note", "email", "bogus"] });
    expect(puckDataToEventPatch(data).rsvpFields).toEqual(["name", "attendance", "email", "note"]);
    const legacy = siteDocumentToPuckData(composeSiteDocument(bare, "", (prefix) => `${prefix}_node`), bare);
    expect(root(legacy).rsvpFields).toEqual(bare.rsvpFields);
    expect(puckDataToEventPatch(withRoot(legacy, { rsvpFields: ["name", "attendance", "phone"] })).rsvpFields).toEqual(["name", "attendance", "phone"]);
    // Legacy pages keep their photos in the site document, so their settings carry no photo fields.
    expect(puckDataToEventPatch(legacy)).not.toHaveProperty("heroImageUrl");
  });
});

describe("RSVP deadline persistence", () => {
  beforeEach(() => { mocks.fake = null; });

  it("keeps the demo store's deadline in step with the saved config", async () => {
    const event = { id: "demo-deadline", slug: "demo-deadline", status: "draft" as const, rsvp_open: false, config: bare };
    saveLocalDemoEvent(event);
    const document = composeSiteDocument(bare, "", (prefix) => `${prefix}_node`);
    await commitStudioRevision({ eventId: event.id, ownerId: null, baseVersionId: "v1", document, config: { ...bare, rsvpDeadline: "June 1, 2027" }, source: "manual", summary: "", prompt: "" });
    expect(getLocalDemoEventById(event.id)?.rsvp_deadline_at).toBe("2027-06-01T23:59:59.999Z");
    await commitStudioRevision({ eventId: event.id, ownerId: null, baseVersionId: "v2", document, config: { ...bare, rsvpDeadline: "" }, source: "manual", summary: "", prompt: "" });
    expect(getLocalDemoEventById(event.id)?.rsvp_deadline_at).toBeNull();
  });

  it("writes the draft's deadline before publishing and the live version's after, in the event's timezone", async () => {
    mocks.fake = createFakeSupabase({
      events: [{ id: "event-1", status: "draft", config: { ...bare, rsvpDeadline: "June 1, 2027" }, published_version_id: null, timezone: "America/Toronto", event_timezone: "Europe/Paris", rsvp_deadline_at: null }],
      event_versions: [{ id: "live", event_id: "event-1", config: { ...bare, rsvpDeadline: "May 20, 2027" } }],
    });
    const event = () => mocks.fake!.table("events")[0];
    // Paris is UTC+2 in summer.
    expect(await syncEventRsvpDeadline("event-1")).toBe("2027-06-01T21:59:59.999Z");
    expect(event().rsvp_deadline_at).toBe("2027-06-01T21:59:59.999Z");
    Object.assign(event(), { status: "published", published_version_id: "live" });
    await syncEventRsvpDeadline("event-1");
    expect(event().rsvp_deadline_at).toBe("2027-05-20T21:59:59.999Z");
    // Clearing the deadline in the live version clears the column.
    mocks.fake.table("event_versions")[0].config = { ...bare, rsvpDeadline: "" };
    await syncEventRsvpDeadline("event-1");
    expect(event().rsvp_deadline_at).toBeNull();
  });
});
