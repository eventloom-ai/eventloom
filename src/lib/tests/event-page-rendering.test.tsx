import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: ({ src }: { src: string }) => <i data-photo={src} /> }));
vi.mock("@/lib/security/rsvp-token", () => ({ createPublicRsvpToken: () => "token-for-tests-0123456789" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, publicRsvpEnabled: () => true, env: { ...actual.env, turnstileSiteKey: () => "", appUrl: () => "https://eventloom.test" } };
});

import { DESIGN_SAMPLES } from "@/app/design-preview/samples";
import { EventPage } from "@/components/event-page";
import { composeSiteDocument } from "@/lib/site-document";
import type { EventDesign } from "@/lib/event-design/schema";
import type { EventRecord } from "@/lib/types";

const wedding = DESIGN_SAMPLES.find((sample) => sample.key === "wedding")!;
const design: EventDesign = { version: 1, styleKey: "editorial", paletteKey: "riviera", content: wedding.content };
const asset = "/api/assets/11111111-1111-4111-8111-111111111111";
const legacyConfig = { ...wedding.config, heroImageUrl: asset, galleryImageUrls: [asset.replace(/1$/, "2"), asset.replace(/1$/, "3"), asset.replace(/1$/, "4"), "https://images.example/photo.jpg"] };
const event = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  id: "event-1",
  slug: "amina-kareem",
  status: "published",
  rsvp_open: true,
  config: legacyConfig,
  document: composeSiteDocument(legacyConfig, "", (prefix) => `${prefix}_node`),
  ...overrides,
});

describe("event page rendering rule", () => {
  it("renders a designed event through the section library with the live RSVP form and guest footer", () => {
    const html = renderToStaticMarkup(<EventPage event={event({ config: { ...legacyConfig, design } })} />);
    expect(html).toContain('data-event-style="editorial"');
    expect(html).toContain('data-palette="riviera"');
    expect(html).not.toContain("eventloom-site-document");
    // The live form, without its own header (the RSVP section titles it).
    expect(html).toContain("<form");
    expect(html).toContain("Send reply");
    expect(html).not.toContain("Confirm your details");
    expect(html).toContain("Made with Eventloom");
    // Uploaded (/api/assets) and https photos reach the hero and the gallery.
    expect(html).toContain(`data-photo="${asset}"`);
    expect(html).toContain('data-photo="https://images.example/photo.jpg"');
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
  });

  it("keeps rendering a legacy event (no design) through its site document, exactly as before", () => {
    const html = renderToStaticMarkup(<EventPage event={event()} />);
    expect(html).toContain("eventloom-site-document");
    expect(html).not.toContain("data-event-style");
    expect(html).toContain("Made with Eventloom");
  });

  it("falls back to the legacy renderer when a stored design is invalid", () => {
    const broken = { ...design, styleKey: "brutalist" } as unknown as EventDesign;
    const html = renderToStaticMarkup(<EventPage event={event({ config: { ...legacyConfig, design: broken } })} />);
    expect(html).toContain("eventloom-site-document");
    expect(html).not.toContain("data-event-style");
  });

  it("tells guests of a designed draft that RSVPs open on publish", () => {
    const html = renderToStaticMarkup(<EventPage event={event({ status: "draft", rsvp_open: false, config: { ...legacyConfig, design } })} />);
    expect(html).toContain("RSVPs open when this event is published.");
    expect(html).not.toContain("<form");
  });
});
