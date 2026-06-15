import { weddingTemplateText, type WeddingTemplateCopy } from "@/lib/wedding-template-content";
import type { EventConfig } from "@/lib/types";

export function eventConfigToTemplateCopy(config: EventConfig, lang: "en" | "ar" = "en"): WeddingTemplateCopy {
  const base = weddingTemplateText[lang];

  return {
    ...base,
    scheduleTitle: base.scheduleTitle,
    scheduleDate: config.date || base.scheduleDate,
    venueName: config.venueName || base.venueName,
    hallInfo: config.hallInfo || base.hallInfo,
    directions: config.directionsLabel || base.directions,
    replySubtitle: config.subtitle || base.replySubtitle,
    deadline: config.rsvpDeadline || base.deadline,
    events: config.schedule.length
      ? config.schedule.map((item) => ({
          title: item.title,
          time: item.time,
          location: item.location ?? "",
          description: item.description ?? "",
        }))
      : base.events,
  };
}
