import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventSite } from "@/components/event-sections/event-site";
import { RsvpForm } from "@/components/rsvp-form";
import { designEventSite } from "@/lib/event-design/design-event-site";
import { isStyleKey } from "@/lib/event-design/styles";
import { DESIGN_SAMPLES } from "../../samples";

export const metadata: Metadata = { title: "Design preview", robots: { index: false, follow: false } };

/** Dev-only: one sample event rendered in one design style. Not available on production deployments. */
export default async function DesignPreviewSamplePage({ params, searchParams }: { params: Promise<{ style: string; sample: string }>; searchParams: Promise<{ dir?: string }> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { style, sample: sampleKey } = await params;
  const sample = DESIGN_SAMPLES.find((item) => item.key === sampleKey);
  if (!isStyleKey(style) || !sample) notFound();
  // ?dir=rtl mirrors the layout to check RTL safety (copy stays English; labels are not localized yet).
  const { dir } = await searchParams;
  const designed = designEventSite(sample.config, style, sample.content);
  const design = dir === "rtl" ? { ...designed, direction: "rtl" as const } : designed;
  return (
    <main data-eventloom-guest-page="">
      <EventSite
        design={design}
        rsvp={<RsvpForm formToken="design-preview" turnstileSiteKey="" isOpen fields={sample.config.rsvpFields} />}
      />
    </main>
  );
}
