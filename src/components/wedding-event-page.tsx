"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RsvpExperience } from "@/components/rsvp-experience";
import { eventConfigToTemplateCopy } from "@/lib/template-copy";
import type { WeddingTemplateLang } from "@/lib/wedding-template-content";
import type { EventRecord } from "@/lib/types";

export function WeddingEventPage({ event, nav }: { event: EventRecord; nav?: ReactNode }) {
  const [lang, setLang] = useState<WeddingTemplateLang>("en");
  const copy = useMemo(() => eventConfigToTemplateCopy(event.config, lang), [event.config, lang]);
  const isAr = lang === "ar";

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="wedding-rsvp relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute left-1/2 top-0 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#ead9bd]/40 blur-3xl" />
        <div className="absolute bottom-36 left-0 h-[28rem] w-[28rem] rounded-full bg-[#d9a3a0]/20 blur-3xl" />
      </div>

      <RsvpExperience event={event} lang={lang} onLangChange={setLang} showNav={Boolean(nav)} nav={nav} copy={copy} />
    </main>
  );
}
