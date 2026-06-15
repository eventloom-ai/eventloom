import type { EventRecord } from "@/lib/types";

export const demoEvent: EventRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "demo-wedding",
  status: "published",
  rsvp_open: true,
  config: {
    title: "Alex & Sarah",
    subtitle: "A private wedding celebration page with bilingual details, guest replies, and a personal website address.",
    eventType: "wedding",
    date: "Summer 2026",
    venueName: "Private Event Hall",
    venueAddress: "Location shared with invited guests",
    rsvpFields: ["name", "attendance", "party_size", "guest_names", "meal_preference", "note"],
    schedule: [
      { title: "Reception", time: "6:00 PM", description: "Guest welcome, soft drinks, and family greetings." },
      { title: "Zaffa & Dabka", time: "6:45 PM", location: "Men's hall", description: "Traditional entrance celebration and dabka." },
      { title: "Couple Entrance", time: "7:15 PM", location: "Women's hall", description: "The couple makes their entrance with family." },
      { title: "Dinner", time: "8:00 PM", location: "Separate halls", description: "Dinner served in the assigned halls." },
    ],
    theme: {
      mood: "soft luxury wedding",
      colors: ["#2c1d19", "#fbf4ef", "#b98079", "#6f3032"],
      fontPairing: "romantic serif with clean sans",
    },
  },
  artifact: {
    generatedAt: new Date(0).toISOString(),
    model: "demo",
    css: "",
    html: `
      <section class="space-y-8">
        <p class="text-sm uppercase tracking-[0.28em] text-[#b98079]">English · العربية</p>
        <div class="max-w-xl rounded-[8px] border border-[#6f3032]/20 bg-white/75 p-8 shadow-[0_24px_80px_rgba(111,48,50,0.12)]">
          <p class="text-sm uppercase tracking-[0.24em] text-[#6f3032]">Together with their families</p>
          <h1 class="mt-5">Alex & Sarah</h1>
          <p class="mt-5 text-xl text-stone-700">Request the honor of your presence at their wedding celebration.</p>
          <div class="mt-8 grid gap-3 text-stone-700">
            <p><strong>Guest reply deadline:</strong> Two weeks before the event</p>
            <p><strong>Men's hall:</strong> Hall A</p>
            <p><strong>Women's hall:</strong> Hall F</p>
          </div>
        </div>
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
      subtitle: "A product launch page waiting to be paid for and shared.",
    },
    artifact: null,
  },
];
