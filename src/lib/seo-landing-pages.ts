import type { Metadata } from "next";

export type SeoLandingPage = {
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  intro: string;
  eventType: string;
  primaryBenefit: string;
  benefits: readonly string[];
  steps: readonly { title: string; description: string }[];
  faqs: readonly { question: string; answer: string }[];
  related: readonly { href: string; label: string }[];
};

export const seoLandingPages = {
  "rsvp-website": {
    slug: "rsvp-website",
    title: "RSVP Website Builder",
    metaDescription: "Create an RSVP website that shares event details, collects guest responses, and keeps your guest list organized in one place.",
    eyebrow: "A simpler RSVP experience",
    heading: "Create an RSVP website guests will actually use.",
    intro: "Give guests one polished link for the details, questions, and RSVP they need. Eventloom keeps every response organized for you.",
    eventType: "other",
    primaryBenefit: "Everything needed for a clear, easy RSVP",
    benefits: [
      "Share one event website link by text, email, or social post.",
      "Ask the questions that matter, from attendance to dietary notes.",
      "See attending, not attending, and pending responses at a glance.",
      "Make changes as plans evolve without sending a new invitation.",
    ],
    steps: [
      { title: "Describe your event", description: "Start with the occasion, date, and the feeling you want guests to get." },
      { title: "Shape the RSVP", description: "Refine the event page and choose the guest questions that fit your plans." },
      { title: "Share one link", description: "Publish when ready and keep every reply connected to the event details." },
    ],
    faqs: [
      { question: "Do guests need an account to RSVP?", answer: "No. Guests open your event link, read the details, answer your questions, and submit their RSVP without creating an Eventloom account." },
      { question: "Can I ask about dietary restrictions?", answer: "Yes. Add questions for dietary needs, plus-ones, party size, travel plans, or any other information you need to plan well." },
      { question: "Can I edit the RSVP website after sharing it?", answer: "Yes. Update the details or questions as your plans change, and guests will always see the current version of your event page." },
    ],
    related: [
      { href: "/online-rsvp", label: "Online RSVP" },
      { href: "/event-website-builder", label: "Event website builder" },
      { href: "/private-event-website", label: "Private event website" },
    ],
  },
  "online-rsvp": {
    slug: "online-rsvp",
    title: "Online RSVP for Any Event",
    metaDescription: "Collect online RSVPs with a beautiful event page. Share the details, ask guest questions, and manage responses from one simple dashboard.",
    eyebrow: "Online RSVPs, without the admin",
    heading: "Collect online RSVPs in one simple place.",
    intro: "Replace scattered messages and spreadsheets with an event page that makes it easy for guests to respond and easy for you to plan.",
    eventType: "other",
    primaryBenefit: "A better way to manage online guest responses",
    benefits: [
      "Let guests RSVP from any device with a shareable event link.",
      "Collect names, attendance, party size, and custom answers together.",
      "Keep the event schedule and RSVP form on the same page.",
      "Follow up with a clear view of who has and has not replied.",
    ],
    steps: [
      { title: "Set the questions", description: "Choose the guest information that helps you make confident plans." },
      { title: "Publish your page", description: "Give guests one destination for the invitation, schedule, location, and RSVP." },
      { title: "Plan with confidence", description: "Use organized responses to plan seating, food, and the details around your event." },
    ],
    faqs: [
      { question: "Is online RSVP better than replying by email?", answer: "A dedicated RSVP page keeps every response in the same format and gives guests the event details at the moment they reply. That means less back-and-forth for everyone." },
      { question: "Can I use online RSVP for a small gathering?", answer: "Absolutely. Eventloom works for a dinner, party, shower, wedding, or any gathering where you want a clear guest list." },
      { question: "Can I share the RSVP link privately?", answer: "Yes. Share the link directly with the people you invited, and use an event page that keeps your details in one private destination." },
    ],
    related: [
      { href: "/rsvp-website", label: "RSVP website" },
      { href: "/wedding-rsvp-website", label: "Wedding RSVP website" },
      { href: "/birthday-event-website", label: "Birthday event website" },
    ],
  },
  "event-website-builder": {
    slug: "event-website-builder",
    title: "Event Website Builder",
    metaDescription: "Build a beautiful event website with Eventloom. Share schedules and location details, collect RSVPs, and publish one link for your guests.",
    eyebrow: "Your event, in one place",
    heading: "Build an event website that feels like your event.",
    intro: "Create a polished home for your plans, from the first invitation to the final guest response. Start with a description and shape the details as you go.",
    eventType: "other",
    primaryBenefit: "An event website without a complicated setup",
    benefits: [
      "Create a custom event page from a simple description.",
      "Bring the invitation, schedule, location, and RSVP together.",
      "Give guests a memorable link instead of a long message thread.",
      "Keep guest information private and available to the event team.",
    ],
    steps: [
      { title: "Start with the occasion", description: "Tell Eventloom what you are hosting and the atmosphere you want to create." },
      { title: "Make it yours", description: "Review the first draft, then refine the wording, details, and guest questions." },
      { title: "Publish when ready", description: "Share your finished event website with one link and manage the replies as they arrive." },
    ],
    faqs: [
      { question: "What kinds of events can I create?", answer: "Create websites for weddings, birthdays, engagement parties, showers, dinners, corporate events, and private celebrations." },
      { question: "Do I need design or coding experience?", answer: "No. Eventloom is designed for plain-language editing, so you can focus on the event rather than learning a website builder." },
      { question: "How much does a published event cost?", answer: "You can create and refine your draft first. Eventloom charges $20 for one published event for one year, with taxes shown at checkout when applicable." },
    ],
    related: [
      { href: "/rsvp-website", label: "RSVP website builder" },
      { href: "/wedding-rsvp-website", label: "Wedding website" },
      { href: "/private-event-website", label: "Private event website" },
    ],
  },
  "wedding-rsvp-website": {
    slug: "wedding-rsvp-website",
    title: "Wedding RSVP Website",
    metaDescription: "Create a wedding RSVP website with your schedule, venue details, guest questions, and an easy online RSVP for everyone you invited.",
    eyebrow: "For the people you love",
    heading: "Create a wedding RSVP website with every detail in its place.",
    intro: "Give your guests a beautiful place to find the schedule, venue, travel notes, and RSVP. Keep the planning information organized behind the scenes.",
    eventType: "wedding",
    primaryBenefit: "A wedding website that helps everyone feel prepared",
    benefits: [
      "Share ceremony and reception details in one elegant destination.",
      "Collect attendance, meal choices, plus-ones, and dietary needs.",
      "Give guests the location and timing information they need before the day.",
      "Keep the guest list and responses organized as plans change.",
    ],
    steps: [
      { title: "Tell your story", description: "Begin with your names, the celebration, and the feeling you want the site to share." },
      { title: "Add wedding details", description: "Include the schedule, venue, travel information, and questions for your guests." },
      { title: "Share with guests", description: "Publish one wedding website link and watch responses arrive in one place." },
    ],
    faqs: [
      { question: "Can a wedding RSVP page collect meal choices?", answer: "Yes. Ask about meal preferences, dietary restrictions, plus-ones, and any other wedding-planning details you need from each guest." },
      { question: "Can I include ceremony and reception information?", answer: "Yes. Your wedding website can keep the schedule, locations, dress guidance, travel notes, and RSVP together for guests." },
      { question: "Can I update the wedding website later?", answer: "Yes. Keep refining the details as your plans become final. Guests will see the latest version at the same link." },
    ],
    related: [
      { href: "/rsvp-website", label: "RSVP website builder" },
      { href: "/online-rsvp", label: "Online RSVP" },
      { href: "/event-website-builder", label: "Event website builder" },
    ],
  },
  "birthday-event-website": {
    slug: "birthday-event-website",
    title: "Birthday Event Website",
    metaDescription: "Create a birthday event website with the party details, location, guest questions, and online RSVP your guests need.",
    eyebrow: "Make the invite part of the celebration",
    heading: "Create a birthday event website worth sharing.",
    intro: "Turn the party invitation into a simple, memorable page with the story, schedule, location, and RSVP details your guests need.",
    eventType: "birthday",
    primaryBenefit: "A birthday invitation with room for every detail",
    benefits: [
      "Share the party theme, timing, location, and special instructions.",
      "Ask who is coming and collect party-size or dietary information.",
      "Give parents, friends, or coworkers one clear link to the invitation.",
      "Keep updates in one place when the plans change.",
    ],
    steps: [
      { title: "Describe the party", description: "Start with the birthday, the occasion, and what guests should know." },
      { title: "Add the fun details", description: "Shape the wording, schedule, location, and questions around your celebration." },
      { title: "Send the invitation", description: "Share your event website and keep the guest responses together as the party gets closer." },
    ],
    faqs: [
      { question: "Can I use this for a child’s birthday party?", answer: "Yes. Add the party information parents need, including timing, location, party size, dietary notes, and any special instructions." },
      { question: "Can I create a birthday website for an adult party?", answer: "Yes. Eventloom works for milestone birthdays, dinner parties, surprise celebrations, and casual gatherings." },
      { question: "Can guests RSVP from their phones?", answer: "Yes. Your event link is designed to be shared and opened on the devices your guests already use." },
    ],
    related: [
      { href: "/rsvp-website", label: "RSVP website" },
      { href: "/private-event-website", label: "Private event website" },
      { href: "/online-rsvp", label: "Online RSVP" },
    ],
  },
  "private-event-website": {
    slug: "private-event-website",
    title: "Private Event Website",
    metaDescription: "Create a private event website for your invited guests. Share important details, collect RSVPs, and keep guest information organized.",
    eyebrow: "For invited guests only",
    heading: "Create a private event website for your people.",
    intro: "Keep the invitation, event details, and RSVP in one link you can share directly with the people on your guest list.",
    eventType: "other",
    primaryBenefit: "A calm, private home for your event plans",
    benefits: [
      "Share one direct link with the guests you invited.",
      "Keep schedules, directions, and special instructions together.",
      "Collect RSVP answers without exposing your guest list publicly.",
      "Give event creators and authorized collaborators access to responses.",
    ],
    steps: [
      { title: "Set the context", description: "Describe the event and the information your invited guests need." },
      { title: "Choose the questions", description: "Ask only what helps you plan, from attendance to dietary or accessibility needs." },
      { title: "Share directly", description: "Send the page to your guest list and keep the responses connected to the details." },
    ],
    faqs: [
      { question: "Is my guest information private?", answer: "RSVP details are available only to the event creator and authorized collaborators. Eventloom does not sell guest information or use it for advertising." },
      { question: "What can I include on a private event page?", answer: "Include the invitation message, schedule, address or venue guidance, dress notes, accessibility details, and RSVP questions." },
      { question: "What events work well as private websites?", answer: "Private websites are useful for family gatherings, dinners, milestone celebrations, showers, weddings, and invite-only professional events." },
    ],
    related: [
      { href: "/rsvp-website", label: "RSVP website" },
      { href: "/event-website-builder", label: "Event website builder" },
      { href: "/birthday-event-website", label: "Birthday event website" },
    ],
  },
} satisfies Record<string, SeoLandingPage>;

export function landingPageMetadata(page: SeoLandingPage): Metadata {
  const title = `${page.title} | Eventloom`;
  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      type: "website",
      title,
      description: page.metaDescription,
      url: `/${page.slug}`,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Eventloom event websites with online RSVPs" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.metaDescription,
      images: ["/opengraph-image"],
    },
  };
}
