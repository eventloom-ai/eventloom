import type { EventDateParts } from "@/lib/event-design/date";
import type {
  ClosingVariant,
  DetailsVariant,
  GalleryVariant,
  HeroVariant,
  RsvpVariant,
  ScheduleVariant,
  StoryVariant,
  StyleKey,
  Tone,
} from "@/lib/event-design/styles";
import type { RsvpField } from "@/lib/types";

/**
 * Copy the AI "art director" writes on top of EventConfig. Everything is optional: a section whose
 * content is missing is left out rather than filled with filler.
 */
export type EventDesignContent = {
  eyebrow?: string;
  detailsHeading?: string;
  scheduleHeading?: string;
  story?: { eyebrow?: string; heading: string; paragraphs: string[]; signature?: string };
  dressCode?: { title?: string; body: string };
  goodToKnowHeading?: string;
  goodToKnow?: { title: string; body: string }[];
  travel?: { heading?: string; items: { title: string; body: string; href?: string; linkLabel?: string }[] };
  galleryHeading?: string;
  rsvpHeading?: string;
  rsvpDescription?: string;
  closingLine?: string;
};

export type DesignImage = { url: string; alt: string };

export type HeroProps = {
  eyebrow: string;
  title: string;
  /** ["Amina", "Kareem"] for a couple title, set over an ampersand. */
  coupleNames: [string, string] | null;
  /** Shrinks the display size for long titles so they never overflow a phone. */
  titleScale: "xl" | "lg" | "md";
  subtitle: string;
  date: EventDateParts;
  venueName: string;
  venueLocality?: string;
  image?: DesignImage;
  monogram: string;
  /** A short number pulled from the title ("30" in "Maya Turns 30"), for poster heroes. */
  numeral?: string;
  cta: { label: string; href: string };
};

export type DetailsProps = {
  heading: string;
  date: EventDateParts;
  venueName: string;
  venueAddress?: string;
  mapUrl?: string;
  hallInfo?: string;
  rsvpDeadline?: string;
  dressCode?: string;
};

export type ScheduleItem = { day?: string; time: string; title: string; location?: string; description?: string };
export type ScheduleProps = { heading: string; eyebrow: string; items: ScheduleItem[]; multiDay: boolean };
export type StoryProps = { eyebrow: string; heading: string; paragraphs: string[]; signature?: string };
export type GalleryProps = { heading: string; images: DesignImage[] };
export type GoodToKnowProps = { heading: string; eyebrow: string; items: { title: string; body: string }[] };
export type TravelProps = { heading: string; eyebrow: string; items: { title: string; body: string; href?: string; linkLabel?: string }[] };
export type RsvpProps = {
  heading: string;
  description: string;
  deadline?: string;
  /** Date, time, place and deadline repeated beside the form so guests never scroll back up. */
  reminder: { label: string; value: string }[];
  fields: RsvpField[];
  anchor: string;
};
export type ClosingProps = { title: string; coupleNames: [string, string] | null; line: string; dateLabel: string; venueName: string; monogram: string };

type Section<K extends string, V extends string, P> = { id: string; kind: K; variant: V; tone: Tone; /** Draw a hairline above (same tone as the previous section). */ ruled: boolean; props: P };

export type DesignedSection =
  | Section<"hero", HeroVariant, HeroProps>
  | Section<"details", DetailsVariant, DetailsProps>
  | Section<"schedule", ScheduleVariant, ScheduleProps>
  | Section<"story", StoryVariant, StoryProps>
  | Section<"gallery", GalleryVariant, GalleryProps>
  | Section<"goodToKnow", "cards", GoodToKnowProps>
  | Section<"travel", "list", TravelProps>
  | Section<"rsvp", RsvpVariant, RsvpProps>
  | Section<"closing", ClosingVariant, ClosingProps>;

export type SectionKind = DesignedSection["kind"];

export type EventSiteDesign = {
  styleKey: StyleKey;
  paletteKey: string;
  direction: "ltr" | "rtl";
  sections: DesignedSection[];
};
