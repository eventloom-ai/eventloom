import type { EventDesignContent } from "@/lib/event-design/types";
import type { EventConfig } from "@/lib/types";

/** Royalty-free photos (Unsplash License) used only by the dev preview. */
const unsplash = (id: string, width = 1800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=78`;

export type DesignSample = { key: string; name: string; note: string; config: EventConfig; content: EventDesignContent };

const wedding: DesignSample = {
  key: "wedding",
  name: "Wedding, with photos",
  note: "Couple title, hero photo, seven gallery photos, story, dress code, FAQs, travel.",
  config: {
    title: "Amina & Kareem",
    subtitle: "We’re getting married among the orchards of the Hudson Valley, and we would love for you to be there.",
    eventType: "wedding",
    date: "Saturday, September 19, 2026 · 4:30 PM",
    venueName: "Willowbrook Farm Estate",
    venueAddress: "214 Orchard Hill Road, Hudson, NY 12534",
    rsvpDeadline: "August 1, 2026",
    schedule: [
      { title: "Ceremony", time: "4:30 PM", location: "The South Lawn", description: "Please arrive by four. We say our vows beneath the old willow." },
      { title: "Cocktail hour", time: "5:30 PM", location: "The Orchard Terrace", description: "Cider, lemonade and small plates while we steal away for photos." },
      { title: "Dinner & toasts", time: "7:00 PM", location: "The Stone Barn", description: "A long-table harvest dinner, and a few words from the people who know us best." },
      { title: "Dancing", time: "8:30 PM", location: "The Stone Barn" },
      { title: "Sparkler send-off", time: "11:30 PM", description: "Shuttles back to Hudson leave right after." },
    ],
    rsvpFields: ["name", "attendance", "party_size", "guest_names", "email", "meal_preference", "note"],
    theme: { mood: "soft romantic garden", colors: ["#3b2b2b", "#fbf6f2", "#9a525b", "#6c5753"], fontPairing: "romantic serif with clean sans" },
    heroImageUrl: unsplash("1532712938310-34cb3982ef74", 2200),
    galleryImageUrls: [
      unsplash("1519741497674-611481863552", 1000),
      unsplash("1520854221256-17451cc331bf", 1000),
      unsplash("1465495976277-4387d4b0b4c6", 1000),
      unsplash("1519225421980-715cb0215aed", 1000),
      unsplash("1522673607200-164d1b6ce486", 1000),
      unsplash("1606216794074-735e91aa2c92", 1000),
      unsplash("1515934751635-c81c6bc9a2d8", 1000),
    ],
  },
  content: {
    story: {
      heading: "Ten years, two cities, one very long phone plan",
      paragraphs: [
        "We met in a crowded library in Amman, both reaching for the last copy of the same book. Kareem let Amina have it, then asked for it back a week later as an excuse to see her again.",
        "A decade, two cities and more airport goodbyes than we can count later, we are finally in one place. We cannot imagine celebrating without the people who carried us through every one of those years.",
      ],
      signature: "Amina & Kareem",
    },
    dressCode: { body: "Garden formal. The ceremony is on the lawn, so leave the stilettos at home." },
    goodToKnow: [
      { title: "An unplugged ceremony", body: "Our photographer has it covered. Phones away until the kiss, please." },
      { title: "Adults only", body: "We love your little ones, but this evening is just for the grown-ups." },
      { title: "Gifts", body: "Your company is the gift. If you insist, a small fund for our first home is linked in the note." },
    ],
    travel: {
      items: [
        { title: "The Maple Inn, Hudson", body: "A block of rooms is held under “Amina & Kareem” until August 15. Shuttles run to and from the farm.", href: "https://example.com/maple-inn", linkLabel: "Book a room" },
        { title: "By train from New York", body: "Amtrak reaches Hudson in two hours from Penn Station; the farm is a ten-minute drive from the station." },
      ],
    },
    galleryHeading: "A few of our favorite moments",
  },
};

const birthday: DesignSample = {
  key: "birthday",
  name: "30th birthday, no photos",
  note: "No photos at all: every section falls back to a typographic or ornamental treatment.",
  config: {
    title: "Maya Turns 30",
    subtitle: "Golden-hour drinks, far too many tacos and karaoke we will all regret. Come celebrate three decades of Maya.",
    eventType: "birthday party",
    date: "Friday, March 13, 2026 · 8:00 PM",
    venueName: "The Juniper Rooftop",
    venueAddress: "1180 Sunset Terrace, Los Angeles, CA 90026",
    rsvpDeadline: "March 1, 2026",
    schedule: [
      { title: "Golden-hour spritzes", time: "8:00 PM", description: "The sun sets over the hills at 8:10. Do not be late for it." },
      { title: "Tacos & toasts", time: "9:00 PM", description: "Street tacos, a veggie table, and a two-minute limit on speeches." },
      { title: "Karaoke hour", time: "10:00 PM", description: "Duets encouraged. Ballads tolerated." },
      { title: "Cake at midnight", time: "12:00 AM" },
    ],
    rsvpFields: ["name", "attendance", "party_size", "email", "note"],
    theme: { mood: "bright party sunset", colors: ["#1e1033", "#fff3e3", "#ff5a36", "#4d4360"], fontPairing: "bold grotesk" },
  },
  content: {
    story: {
      eyebrow: "A note from Maya",
      heading: "Thirty looks good on all of us",
      paragraphs: ["I spent my twenties collecting the best people I know. For one night I want every one of you on the same rooftop, singing badly, eating well and staying out far past our bedtimes."],
      signature: "Maya",
    },
    dressCode: { body: "Something that sparkles. Sequins are strongly encouraged." },
    goodToKnow: [
      { title: "Plus-ones", body: "Absolutely. Add them to your reply so we order enough tacos." },
      { title: "Gifts", body: "Your presence, truly. If you insist, bring a bottle for the party shelf." },
      { title: "Getting home", body: "Parking is tight. Everyone gets a rideshare code after midnight." },
    ],
  },
};

const offsite: DesignSample = {
  key: "offsite",
  name: "Corporate offsite",
  note: "Long title, multi-day date range, day-grouped agenda, one hero photo and no gallery.",
  config: {
    title: "Northwind Product Offsite 2026",
    subtitle: "Three days at the lake to agree on the 2027 roadmap, ship one bold idea and finally meet the people behind the Slack avatars.",
    eventType: "corporate offsite",
    date: "Wednesday, May 20 – Friday, May 22, 2026",
    venueName: "Cedar Lake Lodge",
    venueAddress: "88 Lakeshore Drive, Lake Placid, NY 12946",
    rsvpDeadline: "April 24, 2026",
    schedule: [
      { title: "Arrivals & check-in", time: "Wed · 2:00 PM", location: "Main lodge" },
      { title: "Kickoff: where we are headed", time: "Wed · 4:00 PM", location: "The Boathouse", description: "Priya and the leadership team on the three bets for 2027." },
      { title: "Dinner on the deck", time: "Wed · 7:00 PM" },
      { title: "Roadmap workshops", time: "Thu · 9:00 AM", location: "Breakout cabins", description: "Six cross-functional tracks. Pick yours in the RSVP note." },
      { title: "An afternoon on the water", time: "Thu · 2:00 PM", description: "Canoes, paddleboards or a hammock. Your call." },
      { title: "Demo night & awards", time: "Thu · 7:30 PM", location: "The Great Hall" },
      { title: "Wrap-up & departures", time: "Fri · 10:00 AM", description: "Shuttles to Albany airport leave at noon." },
    ],
    rsvpFields: ["name", "attendance", "email", "meal_preference", "note"],
    theme: { mood: "calm lakeside modern", colors: ["#0c0c0d", "#f5f5f2", "#2b4bf2", "#55565b"], fontPairing: "modern grotesk" },
    heroImageUrl: unsplash("1470770841072-f978cf4d019e", 2200),
  },
  content: {
    story: {
      eyebrow: "Why we are gathering",
      heading: "One team, one room, one roadmap",
      paragraphs: [
        "We grew from 40 to 140 people this year, across nine time zones. Some of you have shipped features together without ever sharing a coffee.",
        "This offsite is about fixing that: three days to decide what we build next, and to remember why we like building it together.",
      ],
      signature: "Priya Raman, CEO",
    },
    goodToKnow: [
      { title: "What to pack", body: "Layers. Mornings at the lake are cold, and comfortable shoes help on the trail walk." },
      { title: "Dietary needs", body: "Tell us in your reply. The kitchen handles everything from vegan to kosher." },
      { title: "Wi-Fi & laptops", body: "Wi-Fi works in the lodge, not in the cabins. Bring a laptop for workshops only." },
    ],
    travel: {
      items: [
        { title: "Company shuttle", body: "Leaves Albany International (ALB) on Wednesday at 11:00 AM and returns on Friday at noon." },
        { title: "Driving yourself", body: "About two and a half hours from Albany, with free parking at the lodge." },
      ],
    },
  },
};

export const DESIGN_SAMPLES: DesignSample[] = [wedding, birthday, offsite];
