"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { RsvpExperience } from "@/components/rsvp-experience";
import { resolveEventPalette } from "@/lib/event-theme";
import { eventConfigToTemplateCopy } from "@/lib/template-copy";
import type { WeddingTemplateLang } from "@/lib/wedding-template-content";
import type { EventRecord } from "@/lib/types";

export function WeddingEventPage({ event, nav }: { event: EventRecord; nav?: ReactNode }) {
  const [lang, setLang] = useState<WeddingTemplateLang>("en");
  const copy = useMemo(() => eventConfigToTemplateCopy(event.config, lang), [event.config, lang]);
  const palette = useMemo(() => resolveEventPalette(event.config), [event.config]);
  const isAr = lang === "ar";

  const themeStyle = {
    ...palette.cssVars,
    background: palette.background,
    color: palette.text,
  } as CSSProperties;

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="wedding-rsvp relative isolate min-h-screen overflow-hidden"
      style={themeStyle}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div
          className="absolute left-1/2 top-0 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `rgba(${palette.accentRgb}, 0.22)` }}
        />
        <div
          className="absolute bottom-36 left-0 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: `rgba(${palette.accentRgb}, 0.14)` }}
        />
      </div>

      <RsvpExperience event={event} lang={lang} onLangChange={setLang} showNav={Boolean(nav)} nav={nav} copy={copy} />
    </main>
  );
}
