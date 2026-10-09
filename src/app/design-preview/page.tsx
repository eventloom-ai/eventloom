import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DESIGN_STYLES, STYLE_KEYS } from "@/lib/event-design/styles";
import { DESIGN_SAMPLES } from "./samples";

export const metadata: Metadata = { title: "Design preview", robots: { index: false, follow: false } };

/** Dev-only index of the event-site design prototype: every style × sample. */
export default function DesignPreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <main data-eventloom-guest-page="" className="min-h-screen bg-[#f4f3ef] px-5 py-14 text-[#161513] sm:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5b5750]">Prototype · not shipped</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Event site design system</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#45423c]">Five design families, each a font pairing, palette set, ornament language and section-variant preference. Every sample is laid out by the deterministic <code className="rounded bg-black/5 px-1.5 py-0.5 text-[0.9em]">designEventSite(config, style)</code>.</p>
        <ul className="mt-12 grid list-none gap-5 p-0">
          {STYLE_KEYS.map((key) => {
            const style = DESIGN_STYLES[key];
            const palette = style.palettes[0];
            return (
              <li key={key} className="grid gap-6 rounded-xl border border-black/10 bg-white p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex">
                      {[palette.tones.base.bg, palette.tones.base.ink, palette.accent, palette.tones.inverse.bg].map((color) => <span key={color} className="-ms-1 size-5 rounded-full border border-black/10 first:ms-0" style={{ background: color }} />)}
                    </span>
                    <h2 className="text-2xl" style={{ fontFamily: style.fonts.display, fontWeight: style.type.displayWeight }}>{style.name}</h2>
                  </div>
                  <p className="mt-2 max-w-3xl leading-relaxed text-[#45423c]">{style.identity}</p>
                  <p className="mt-1 text-sm text-[#5b5750]">Best for: {style.bestFor}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DESIGN_SAMPLES.map((sample) => (
                    <Link key={sample.key} href={`/design-preview/${key}/${sample.key}`} className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5">{sample.name}</Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
