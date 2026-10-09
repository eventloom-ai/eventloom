import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs, BulletList, eyebrow, FaqSection, sectionHeading, SourcesList, textLink } from "@/components/comparison-parts";
import { JsonLd } from "@/components/json-ld";
import { MarketingHeader } from "@/components/marketing-header";
import { appUrl } from "@/lib/env";
import {
  COMPARE_PATH,
  comparePath,
  comparisonRowLabels,
  competitors,
  eventloomColumn,
  formatCheckedDate,
  GUIDE_PATH,
  type Competitor,
} from "@/lib/comparisons";
import { absoluteUrl, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/structured-data";

export function ComparisonPage({ competitor }: { competitor: Competitor }) {
  const siteUrl = appUrl();
  const path = comparePath(competitor.slug);
  const others = competitors.filter((item) => item.slug !== competitor.slug);

  return (
    <main className="overflow-hidden bg-[#e7ecdf] text-[#302821]">
      <JsonLd data={[
        faqPageJsonLd(competitor.faqs, absoluteUrl(siteUrl, path)),
        breadcrumbJsonLd(siteUrl, [{ name: "Eventloom", path: "/" }, { name: "Compare", path: COMPARE_PATH }, { name: `Eventloom vs ${competitor.name}`, path }]),
      ]} />
      <MarketingHeader />

      <section className="bg-[#302821] px-5 pb-16 pt-10 text-[#fff9f2] sm:px-8 sm:pb-24 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <Breadcrumbs items={[{ name: "Compare", href: COMPARE_PATH }, { name: `Eventloom vs ${competitor.name}` }]} />
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">{competitor.category} · Updated <time dateTime={competitor.checkedAt}>{formatCheckedDate(competitor.checkedAt)}</time></p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-playfair)] text-5xl leading-[0.94] tracking-[-0.055em] sm:text-7xl">Eventloom vs {competitor.name}</h1>
          <div className="mt-10 max-w-3xl border-l-2 border-[#dfb89f] pl-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">The short answer</h2>
            <p className="mt-3 text-lg leading-8 text-[#fff9f2]/90">{competitor.verdict}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="table-heading" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className={eyebrow}>Side by side</p>
          <h2 id="table-heading" className={`${sectionHeading} max-w-2xl`}>Eventloom and {competitor.name}, feature by feature.</h2>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-[#302821]/10 bg-[#fffaf3] shadow-[0_10px_30px_rgba(65,43,28,0.05)]">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm leading-6">
              <caption className="sr-only">Eventloom compared with {competitor.name}</caption>
              <thead>
                <tr className="border-b border-[#302821]/15 text-[11px] uppercase tracking-[0.16em] text-[#8a6153]">
                  <th scope="col" className="w-[22%] p-4 font-semibold sm:p-5">Feature</th>
                  <th scope="col" className="w-[39%] p-4 font-semibold sm:p-5">Eventloom</th>
                  <th scope="col" className="w-[39%] p-4 font-semibold sm:p-5">{competitor.name}</th>
                </tr>
              </thead>
              <tbody>
                {competitor.rows.map((row) => (
                  <tr key={row.key} className="border-b border-[#302821]/10 align-top last:border-b-0">
                    <th scope="row" className="p-4 font-semibold text-[#302821] sm:p-5">{comparisonRowLabels[row.key]}</th>
                    <td className="p-4 text-[#5f5248] sm:p-5">{eventloomColumn[row.key]}</td>
                    <td className="p-4 text-[#5f5248] sm:p-5">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="choose-heading" className="border-y border-[#302821]/10 bg-[#fffaf3] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className={eyebrow}>Which should you pick?</p>
          <h2 id="choose-heading" className={`${sectionHeading} max-w-2xl`}>It depends on what you need from the tool.</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <BulletList title="Choose Eventloom if…" items={competitor.chooseEventloom} tone="dark" />
            <BulletList title={`Choose ${competitor.name} if…`} items={competitor.chooseCompetitor} />
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-7 text-[#6d6055]">{competitor.bottomLine}</p>
        </div>
      </section>

      <FaqSection heading={`Eventloom vs ${competitor.name} FAQ.`} faqs={competitor.faqs} />

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl border-y border-[#302821]/15 py-14 text-center sm:py-20">
          <p className={eyebrow}>Try it before you decide</p>
          <h2 className="mx-auto mt-5 max-w-3xl font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-6xl">See what Eventloom drafts for your event.</h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#6d6055]">Describe the event and review the draft for free. You only pay $20 if you publish it.</p>
          <Link href="/#create" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#302821] px-6 py-3.5 text-sm font-semibold text-[#fffaf3] transition hover:bg-[#4a2d2a]">Describe your event <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </section>

      <SourcesList sources={competitor.sources} checkedAt={competitor.checkedAt} />

      <section aria-labelledby="more-heading" className="border-t border-[#302821]/10 px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-6xl text-sm text-[#6d6055]">
          <h2 id="more-heading" className="font-semibold text-[#302821]">More comparisons</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
            {others.map((item) => <li key={item.slug}><Link href={comparePath(item.slug)} className={textLink}>Eventloom vs {item.name}</Link></li>)}
            <li><Link href={GUIDE_PATH} className={textLink}>Best RSVP website builders</Link></li>
            <li><Link href="/templates" className={textLink}>Event website templates</Link></li>
          </ul>
        </div>
      </section>
    </main>
  );
}
