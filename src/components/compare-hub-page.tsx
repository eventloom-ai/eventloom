import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs, eyebrow, FaqSection, sectionHeading, textLink } from "@/components/comparison-parts";
import { JsonLd } from "@/components/json-ld";
import { MarketingHeader } from "@/components/marketing-header";
import { appUrl } from "@/lib/env";
import { COMPARE_PATH, compareHubCopy, comparePath, competitors, formatCheckedDate, GUIDE_PATH, latestCheckedAt } from "@/lib/comparisons";
import { absoluteUrl, breadcrumbJsonLd, faqPageJsonLd, itemListJsonLd } from "@/lib/structured-data";

export function CompareHubPage() {
  const siteUrl = appUrl();
  const checkedAt = latestCheckedAt();

  return (
    <main className="overflow-hidden bg-[#e7ecdf] text-[#302821]">
      <JsonLd data={[
        itemListJsonLd(siteUrl, "Eventloom comparisons", competitors.map((item) => ({ name: `Eventloom vs ${item.name}`, path: comparePath(item.slug) }))),
        faqPageJsonLd(compareHubCopy.faqs, absoluteUrl(siteUrl, COMPARE_PATH)),
        breadcrumbJsonLd(siteUrl, [{ name: "Eventloom", path: "/" }, { name: "Compare", path: COMPARE_PATH }]),
      ]} />
      <MarketingHeader />

      <section className="bg-[#302821] px-5 pb-16 pt-10 text-[#fff9f2] sm:px-8 sm:pb-24 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <Breadcrumbs items={[{ name: "Eventloom", href: "/" }, { name: "Compare" }]} />
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">Honest comparisons · Updated <time dateTime={checkedAt}>{formatCheckedDate(checkedAt)}</time></p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-playfair)] text-5xl leading-[0.94] tracking-[-0.055em] sm:text-7xl">{compareHubCopy.heading}</h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-[#fff9f2]/85">{compareHubCopy.summary}</p>
        </div>
      </section>

      <section aria-labelledby="list-heading" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className={eyebrow}>Head to head</p>
              <h2 id="list-heading" className={`${sectionHeading} max-w-2xl`}>Pick the tool you are weighing up.</h2>
            </div>
            <Link href={GUIDE_PATH} className="inline-flex items-center gap-2 border-b border-[#302821] pb-1 text-sm font-semibold text-[#302821] transition hover:border-[#a37561] hover:text-[#8a6153]">Read the full RSVP builders guide <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#302821]/10 bg-[#302821]/10 sm:grid-cols-2 lg:grid-cols-4">
            {competitors.map((item) => (
              <li key={item.slug} className="bg-[#fffaf3]">
                <Link href={comparePath(item.slug)} className="group flex h-full flex-col justify-between gap-6 p-6 transition hover:bg-white">
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6153]">{item.category}</span>
                    <span className="mt-3 block text-lg font-semibold tracking-[-0.02em]">Eventloom vs {item.name}</span>
                    <span className="mt-2 block text-sm leading-6 text-[#74675d]">{item.oneLiner}</span>
                  </span>
                  <ArrowRight className="size-4 text-[#a37561] transition group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li className="bg-[#302821]">
              <Link href={GUIDE_PATH} className="group flex h-full flex-col justify-between gap-6 p-6 text-[#fff9f2] transition hover:bg-[#4a2d2a]">
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#dfb89f]">Roundup</span>
                  <span className="mt-3 block text-lg font-semibold tracking-[-0.02em]">Best RSVP website builders</span>
                  <span className="mt-2 block text-sm leading-6 text-[#eadbd0]/70">All seven tools plus Eventloom, sorted by wedding, party, corporate, and free use.</span>
                </span>
                <ArrowRight className="size-4 text-[#dfb89f] transition group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="eventloom-heading" className="border-y border-[#302821]/10 bg-[#fffaf3] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className={eyebrow}>Where Eventloom fits</p>
            <h2 id="eventloom-heading" className={`${sectionHeading} max-w-sm`}>What we do, and what we don’t.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-base font-semibold">Eventloom does</h3>
              <ul className="mt-4 space-y-3 border-t border-[#302821]/15 pt-4 text-sm leading-7 text-[#5f5248]">{compareHubCopy.does.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h3 className="text-base font-semibold">Eventloom doesn’t</h3>
              <ul className="mt-4 space-y-3 border-t border-[#302821]/15 pt-4 text-sm leading-7 text-[#5f5248]">{compareHubCopy.doesNot.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <FaqSection heading="Comparing RSVP tools." faqs={compareHubCopy.faqs} />

      <section className="px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#6d6055]">
          <span className="font-semibold text-[#302821]">Explore more:</span>
          <Link href={GUIDE_PATH} className={textLink}>Best RSVP website builders</Link>
          <Link href="/templates" className={textLink}>Event website templates</Link>
          <Link href="/rsvp-website" className={textLink}>RSVP website builder</Link>
          <Link href="/wedding-rsvp-website" className={textLink}>Wedding RSVP website</Link>
        </div>
      </section>
    </main>
  );
}
