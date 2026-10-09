import { briefFacts } from "@/lib/agent/brief-facts";
import type { EventConfig } from "@/lib/types";

export type ImageInput = {
  name: string;
  mediaType: string;
  dataUrl: string;
  // Set once the image is stored as an event asset; site documents only accept this URL, never the data URL.
  storedUrl?: string;
};

function namesFromPrompt(prompt: string) {
  const skip = new Set(["my", "our", "the", "and", "for", "with", "brother", "sister", "son", "daughter", "friend", "men", "mens", "women", "womens", "male", "female", "hall", "guest", "guests"]);
  const match = prompt.match(/(?:of|for)\s+(?:(?:my|our)\s+)?(?:brother|sister|son|daughter|friend)?\s*([\p{L}][\p{L}'’-]{1,24})\s+(?:and|&)\s+([\p{L}][\p{L}'’-]{1,24})/iu);
  const first = match?.[1]?.trim() ?? "";
  const second = match?.[2]?.trim() ?? "";
  const key = (value: string) => value.toLowerCase().replace(/['’]s$/u, "").replace(/['’-]/g, "");
  if (!first || !second || skip.has(key(first)) || skip.has(key(second))) return null;
  const title = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1);
  return `${title(first)} & ${title(second)}`;
}

export function defaultEventConfig(prompt: string): EventConfig {
  const isWedding = /\bwedding\b/i.test(prompt);
  const hasSeparateHalls = /(?:separate|different)\s+(?:men'?s|women'?s|male|female).{0,50}(?:hall|reception)|(?:men'?s|women'?s).{0,50}(?:separate|different).{0,50}(?:hall|reception)/i.test(prompt);
  const names = namesFromPrompt(prompt);
  const facts = briefFacts(prompt);
  return {
    title: names ? (isWedding ? `${names}` : names) : isWedding ? "Wedding celebration" : "Your event",
    subtitle: names ? (isWedding ? `The wedding of ${names}.` : `An event for ${names}.`) : "Details to be announced.",
    eventType: isWedding ? "wedding" : /\bengagement\b/i.test(prompt) ? "engagement" : "event",
    date: facts.date ? facts.time ? `${facts.date} at ${facts.time}` : facts.date : "Date to be announced",
    venueName: facts.venue ?? "Venue to be announced",
    rsvpFields: ["name", "attendance", "party_size", "guest_names", "note"],
    schedule: hasSeparateHalls
      ? [
          { title: "Men's hall", time: "Time to be announced", location: "Men's hall", description: "Details to be announced." },
          { title: "Women's hall", time: "Time to be announced", location: "Women's hall", description: "Details to be announced." },
        ]
      : [{ title: "Event details", time: facts.time ?? "Time to be announced", description: "Details to be announced." }],
    theme: {
      mood: "custom editorial",
      colors: ["#191713", "#f7f4ee", "#b48a5a", "#405448"],
      fontPairing: "elegant serif with modern sans",
    },
  };
}
