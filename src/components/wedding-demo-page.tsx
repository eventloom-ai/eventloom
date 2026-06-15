"use client";

import Link from "next/link";
import { useState } from "react";
import { RsvpExperience } from "@/components/rsvp-experience";
import { weddingTemplateText, type WeddingTemplateLang } from "@/lib/wedding-template-content";
import type { EventRecord } from "@/lib/types";

export function WeddingDemoPage({ event }: { event: EventRecord }) {
  const [lang, setLang] = useState<WeddingTemplateLang>("en");
  const t = weddingTemplateText[lang];
  const isAr = lang === "ar";

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="wedding-rsvp relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute left-1/2 top-0 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#ead9bd]/40 blur-3xl" />
        <div className="absolute bottom-36 left-0 h-[28rem] w-[28rem] rounded-full bg-[#d9a3a0]/20 blur-3xl" />
      </div>

      <RsvpExperience
        event={event}
        lang={lang}
        onLangChange={setLang}
        showNav
        nav={
          <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="rounded-full border border-white/60 bg-white/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f3032] shadow-sm backdrop-blur-xl transition hover:bg-white/65"
              >
                Back home
              </Link>
              <Link
                href="/?template=wedding#create"
                className="rounded-full border border-[#6f3032]/20 bg-[#6f3032] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-[#5f292b]"
              >
                {t.useTemplateLabel}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setLang(isAr ? "en" : "ar")}
              className="rounded-full border border-white/60 bg-white/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f3032] shadow-sm backdrop-blur-xl transition hover:bg-white/65"
            >
              {t.language}
            </button>
          </div>
        }
      />
    </main>
  );
}
