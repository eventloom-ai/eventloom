import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { MarketingHeader } from "@/components/marketing-header";
import { TemplateThumbnail } from "@/components/template-preview";
import { appUrl } from "@/lib/env";
import { occasionPath, occasionTemplates, TEMPLATES_PATH } from "@/lib/occasion-templates";
import { seoLandingPages } from "@/lib/seo-landing-pages";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

export function TemplatesGalleryPage() {
  const siteUrl = appUrl();
  return (
    <main className="overflow-hidden bg-[#e7ecdf] text-[#302821]">
      <JsonLd data={[
        itemListJsonLd(siteUrl, "Event website templates", occasionTemplates.map((occasion) => ({ name: `${occasion.name} website template`, path: occasionPath(occasion.slug) }))),
        breadcrumbJsonLd(siteUrl, [{ name: "Eventloom", path: "/" }, { name: "Templates", path: TEMPLATES_PATH }]),
      ]} />
      <MarketingHeader />

      <section className="bg-[#302821] px-5 py-16 text-[#fff9f2] sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">Templates</p>
            <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-playfair)] text-5xl leading-[0.94] tracking-[-0.055em] sm:text-7xl">Event website templates with RSVP.</h1>
          </div>
          <div>
            <p className="max-w-xl text-base leading-8 text-[#eadbd0]/75">Each template is a real sample page with a schedule, venue, and RSVP, plus a short planning guide for that occasion. Pick one, add your details, and review the draft before you publish.</p>
            <p className="mt-5 text-[13px] leading-6 text-[#eadbd0]/55">Draft it first · $20 once to publish for a year · Guests reply without an account</p>
          </div>
        </div>
      </section>

      <section aria-label="All templates" className="px-5 py-16 sm:px-8 sm:py-24">
        <ul className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {occasionTemplates.map((occasion) => (
            <li key={occasion.slug}>
              <Link href={occasionPath(occasion.slug)} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#302821]/10 bg-[#fffaf3] shadow-[0_10px_30px_rgba(65,43,28,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(65,43,28,0.1)]">
                <TemplateThumbnail occasion={occasion} />
                <span className="flex flex-1 items-end justify-between gap-4 border-t border-[#302821]/10 p-5">
                  <span>
                    <span className="block text-base font-semibold tracking-[-0.02em]">{occasion.name}</span>
                    <span className="mt-1.5 block text-sm leading-6 text-[#74675d]">{occasion.cardBlurb}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[#a37561] transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-[#302821]/10 bg-[#fffaf3] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Not listed?</p>
            <h2 className="mt-5 max-w-sm font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em]">Describe any event and start from there.</h2>
            <Link href="/#create" className="mt-7 inline-flex items-center gap-2 border-b border-[#302821] pb-1 text-sm font-semibold text-[#302821] transition hover:border-[#a37561] hover:text-[#8a6153]">Describe your event <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-[#302821]/10 bg-[#302821]/10 sm:grid-cols-2">
            {Object.values(seoLandingPages).map((page) => (
              <li key={page.slug} className="bg-[#fffaf3]">
                <Link href={`/${page.slug}`} className="block h-full p-5 transition hover:bg-white">
                  <span className="block text-sm font-semibold">{page.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-[#74675d]">{page.primaryBenefit}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
