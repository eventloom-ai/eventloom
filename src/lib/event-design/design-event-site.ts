import { coupleTitleLines, eventInitials } from "@/lib/couple-title";
import { parseEventDate, splitScheduleTime } from "@/lib/event-design/date";
import { DESIGN_STYLES, pickPalette, type StyleKey, type Tone } from "@/lib/event-design/styles";
import type { DesignImage, DesignedSection, EventDesignContent, EventSiteDesign, HeroProps } from "@/lib/event-design/types";
import type { EventConfig } from "@/lib/types";

type EventKind = "wedding" | "birthday" | "corporate" | "other";

function eventKind(eventType: string): EventKind {
  if (/wedding|engagement|anniversary|nikah|nikkah|vow|elopement|زفاف|خطوبة|عرس/i.test(eventType)) return "wedding";
  if (/birthday|bday|turns|party|عيد ميلاد/i.test(eventType)) return "birthday";
  if (/corporate|offsite|off-site|conference|summit|retreat|company|team|launch|meetup|workshop/i.test(eventType)) return "corporate";
  return "other";
}

const EYEBROWS: Record<EventKind, Partial<Record<StyleKey, string>>> = {
  wedding: { editorial: "The wedding of", romantic: "Together with their families", minimal: "Wedding", playful: "We’re getting married", noir: "The wedding celebration of" },
  birthday: { editorial: "A birthday party", romantic: "Please join us to celebrate", minimal: "Birthday", playful: "You’re invited", noir: "An evening in honor of" },
  corporate: {},
  other: {},
};

const COPY: Record<EventKind, { details: string; schedule: string; rsvp: string; closing: string; story: string }> = {
  wedding: { details: "When & where", schedule: "Order of the day", rsvp: "Kindly reply", closing: "We can’t wait to celebrate with you.", story: "Our story" },
  birthday: { details: "When & where", schedule: "The plan", rsvp: "Are you in?", closing: "See you there.", story: "A note from the host" },
  corporate: { details: "Logistics", schedule: "Agenda", rsvp: "Confirm your place", closing: "See you there.", story: "Why we’re gathering" },
  other: { details: "When & where", schedule: "Schedule", rsvp: "Kindly reply", closing: "See you there.", story: "A note from the hosts" },
};

const titleCase = (value: string) => value.trim().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
const isSafeUrl = (value: string | undefined): value is string => Boolean(value && (/^https:\/\//i.test(value) || value.startsWith("/")));
const isTba = (value: string) => !value.trim() || /to be announced|\btba\b|\btbd\b|shared with invited guests/i.test(value);

function titleScale(title: string, couple: [string, string] | null): HeroProps["titleScale"] {
  if (couple) return Math.max(couple[0].length, couple[1].length) <= 9 ? "xl" : "lg";
  const longestWord = Math.max(...title.split(/\s+/).map((word) => word.length));
  const byLength = title.length <= 12 ? "xl" : title.length <= 22 ? "lg" : "md";
  if (longestWord > 14) return "md";
  if (longestWord > 11 && byLength === "xl") return "lg";
  return byLength;
}

function locality(address: string | undefined) {
  if (!address || isTba(address)) return undefined;
  const parts = address.split(",").map((part) => part.replace(/\b\d{4,}(?:-\d+)?\b/g, "").trim()).filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join(", ") : undefined;
}

function hasRtlScript(value: string) {
  return /[֐-ࣿיִ-﷿ﹰ-﻿]/.test(value);
}

export type DesignOptions = { paletteKey?: string };

/**
 * Deterministic "art director" layout: EventConfig + a style → an ordered list of sections with variants,
 * tones and fully resolved props. The AI only chooses the style/palette and writes EventDesignContent.
 */
export function designEventSite(config: EventConfig, styleKey: StyleKey, content: EventDesignContent = {}, options: DesignOptions = {}): EventSiteDesign {
  const style = DESIGN_STYLES[styleKey];
  const palette = pickPalette(style, `${config.theme.mood} ${config.theme.fontPairing}`, options.paletteKey);
  const kind = eventKind(config.eventType);
  const copy = COPY[kind];
  const date = parseEventDate(config.date, config.schedule);
  const couple = coupleTitleLines(config.title, config.eventType);
  const photos: DesignImage[] = [config.heroImageUrl, ...(config.galleryImageUrls ?? [])]
    .filter(isSafeUrl)
    .filter((url, index, all) => all.indexOf(url) === index)
    .map((url, index) => ({ url, alt: index === 0 ? `${config.title}` : `${config.title}, photo ${index + 1}` }));
  const heroImage = photos[0];
  const galleryImages = photos.slice(1);
  const venueKnown = !isTba(config.venueName);
  const deadline = config.rsvpDeadline?.trim() || undefined;
  const sections: Omit<DesignedSection, "tone" | "ruled">[] = [];

  sections.push({
    id: "hero",
    kind: "hero",
    variant: heroImage ? style.variants.heroWithPhoto : style.variants.heroWithoutPhoto,
    props: {
      eyebrow: content.eyebrow ?? EYEBROWS[kind][styleKey] ?? titleCase(config.eventType),
      title: config.title,
      coupleNames: couple,
      titleScale: titleScale(config.title, couple),
      subtitle: config.subtitle,
      date,
      venueName: config.venueName,
      venueLocality: locality(config.venueAddress),
      image: heroImage,
      monogram: eventInitials(config.title, config.eventType),
      numeral: config.title.match(/\b(\d{1,3})(?:st|nd|rd|th)?\b/)?.[1],
      cta: { label: "RSVP", href: "#rsvp" },
    },
  });

  sections.push({
    id: "details",
    kind: "details",
    variant: style.variants.details,
    props: {
      heading: copy.details,
      date,
      venueName: config.venueName,
      venueAddress: config.venueAddress && !isTba(config.venueAddress) ? config.venueAddress : undefined,
      mapUrl: venueKnown ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${config.venueName} ${config.venueAddress ?? ""}`.trim())}` : undefined,
      hallInfo: config.hallInfo,
      rsvpDeadline: deadline,
      dressCode: content.dressCode?.body,
    },
  });

  if (content.story?.paragraphs.length) {
    sections.push({
      id: "story",
      kind: "story",
      variant: style.variants.story,
      props: { eyebrow: content.story.eyebrow ?? copy.story, heading: content.story.heading, paragraphs: content.story.paragraphs, signature: content.story.signature },
    });
  }

  const scheduleItems = config.schedule
    .filter((item) => item.title.trim() && item.title !== "Event details")
    .map((item) => ({ ...splitScheduleTime(item.time), title: item.title, location: item.location, description: item.description }));
  if (scheduleItems.length >= 2) {
    sections.push({
      id: "schedule",
      kind: "schedule",
      variant: style.variants.schedule,
      props: { eyebrow: "Schedule", heading: copy.schedule, items: scheduleItems, multiDay: new Set(scheduleItems.map((item) => item.day).filter(Boolean)).size > 1 },
    });
  }

  if (galleryImages.length >= 3) {
    sections.push({ id: "gallery", kind: "gallery", variant: style.variants.gallery, props: { heading: content.galleryHeading ?? "Moments", images: galleryImages.slice(0, 9) } });
  }

  const goodToKnow = [
    ...(content.dressCode ? [{ title: content.dressCode.title ?? "Dress code", body: content.dressCode.body }] : []),
    ...(content.goodToKnow ?? []),
  ];
  if (goodToKnow.length >= 2) {
    sections.push({ id: "good-to-know", kind: "goodToKnow", variant: "cards", props: { eyebrow: "Before you go", heading: "Good to know", items: goodToKnow.slice(0, 6) } });
  }

  if (content.travel?.items.length) {
    sections.push({ id: "travel", kind: "travel", variant: "list", props: { eyebrow: "Getting there", heading: content.travel.heading ?? "Travel & stay", items: content.travel.items.slice(0, 4) } });
  }

  sections.push({
    id: "rsvp",
    kind: "rsvp",
    variant: style.variants.rsvp,
    props: {
      heading: content.rsvpHeading ?? copy.rsvp,
      description: content.rsvpDescription ?? (deadline ? `Please reply by ${deadline} so we can plan for you.` : "Let us know whether you can make it."),
      deadline,
      reminder: [
        { label: "Date", value: date.dateLabel },
        ...(date.time ? [{ label: date.day?.includes("–") ? "Starts" : "Time", value: date.time }] : []),
        { label: "Place", value: config.venueName },
        ...(deadline ? [{ label: "Reply by", value: deadline }] : []),
      ],
      fields: config.rsvpFields,
      anchor: "rsvp",
    },
  });

  sections.push({
    id: "closing",
    kind: "closing",
    variant: style.variants.closing,
    props: { title: config.title, coupleNames: couple, line: content.closingLine ?? copy.closing, dateLabel: date.dateLabel, venueName: config.venueName, monogram: eventInitials(config.title, config.eventType) },
  });

  // Rhythm: each style says which tone a section prefers; neighbours on the same tone either alternate
  // (tone separation) or get a hairline between them (rule separation).
  let previous: Tone | null = null;
  let previousIsCover = false;
  const toned = sections.map((section) => {
    let tone: Tone = style.tones[section.kind as keyof typeof style.tones] ?? "base";
    let ruled = false;
    if (previous === tone && !previousIsCover) {
      if (style.separation === "tone") tone = tone === "base" ? "alt" : "base";
      else ruled = true;
    }
    previous = tone;
    previousIsCover = section.kind === "hero" && section.variant === "cover";
    return { ...section, tone, ruled } as DesignedSection;
  });

  return {
    styleKey,
    paletteKey: palette.key,
    direction: hasRtlScript(`${config.title} ${config.subtitle}`) ? "rtl" : "ltr",
    sections: toned,
  };
}
