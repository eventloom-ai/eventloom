import type { EventRecord } from "@/lib/types";

export const demoEvent: EventRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "demo-wedding",
  status: "published",
  rsvp_open: true,
  config: {
    title: "Mira & Adam",
    subtitle: "An AI-generated celebration page with RSVP collection, custom design, and domain-ready publishing.",
    eventType: "wedding",
    date: "2026-09-12",
    venueName: "The Glasshouse",
    venueAddress: "Toronto, Ontario",
    rsvpFields: ["name", "attendance", "party_size", "guest_names", "meal_preference", "note"],
    schedule: [
      { title: "Welcome", time: "5:30 PM", description: "Soft drinks, photos, and arrivals." },
      { title: "Ceremony", time: "6:15 PM", description: "A short ceremony with family and friends." },
      { title: "Dinner", time: "7:30 PM", description: "Seated dinner and speeches." },
      { title: "Celebration", time: "9:00 PM", description: "Music, dessert, and dancing." },
    ],
    theme: {
      mood: "modern editorial",
      colors: ["#191713", "#f7f4ee", "#b48a5a", "#405448"],
      fontPairing: "elegant serif with clean sans",
    },
  },
  artifact: {
    generatedAt: new Date(0).toISOString(),
    model: "demo",
    css: "",
    html: `
      <section class="space-y-8">
        <p class="text-sm uppercase tracking-[0.28em] text-[#b48a5a]">AI event website preview</p>
        <h1>Mira & Adam</h1>
        <p class="max-w-2xl text-xl text-stone-700">A polished custom event site generated from a conversation, backed by Eventloom RSVP infrastructure.</p>
      </section>
    `,
  },
};

export const demoEvents: EventRecord[] = [
  demoEvent,
  {
    ...demoEvent,
    id: "00000000-0000-4000-8000-000000000002",
    slug: "launch-night",
    status: "draft",
    rsvp_open: false,
    config: {
      ...demoEvent.config,
      title: "Launch Night",
      eventType: "corporate",
      subtitle: "A product launch RSVP page waiting for payment and publication.",
    },
    artifact: null,
  },
];
