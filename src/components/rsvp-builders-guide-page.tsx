import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs, eyebrow, FaqSection, sectionHeading, SourcesList, textLink } from "@/components/comparison-parts";
import { JsonLd } from "@/components/json-ld";
import { MarketingHeader } from "@/components/marketing-header";
import { appUrl } from "@/lib/env";
import { COMPARE_PATH, comparePath, competitors, formatCheckedDate, getCompetitor, GUIDE_PATH, guideCopy, guideItems, latestCheckedAt } from "@/lib/comparisons";
import { absoluteUrl, breadcrumbJsonLd, faqPageJsonLd, itemListJsonLd } from "@/lib/structured-data";

export function RsvpBuildersGuidePage() {
  const siteUrl = appUrl();
  const checkedAt = latestCheckedAt();
  const sources = competitors.flatMap((competitor) => competitor.sources);

  return (
    <main className="overflow-hidden bg-[#e7ecdf] text-[#302821]">
      <JsonLd data={[
        itemListJsonLd(siteUrl, guideCopy.title, guideItems()),
        faqPageJsonLd(guideCopy.faqs, absoluteUrl(siteUrl, GUIDE_PATH)),
        breadcrumbJsonLd(siteUrl, [{ name: "Eventloom", path: "/" }, { name: guideCopy.title, path: GUIDE_PATH }]),
      ]} />
      <MarketingHeader />

      <section className="bg-[#302821] px-5 pb-16 pt-10 text-[#fff9f2] sm:px-8 sm:pb-24 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <Breadcrumbs items={[{ name: "Eventloom", href: "/" }, { name: "Guides" }, { name: guideCopy.title }]} />
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">Guide · Updated <time dateTime={checkedAt}>{formatCheckedDate(checkedAt)}</time></p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-playfair)] text-5xl leading-[0.94] tracking-[-0.055em] sm:text-7xl">{guideCopy.heading}</h1>
          <div className="mt-10 max-w-3xl border-l-2 border-[#dfb89f] pl-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">The short answer</h2>
            <p className="mt-3 text-lg leading-8 text-[#fff9f2]/90">{guideCopy.summary}</p>
          </div>
          <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#eadbd0]/75">
            {guideCopy.useCases.map((useCase) => <a key={useCase.id} href={`#${useCase.id}`} className="underline decoration-[#dfb89f]/60 underline-offset-4 transition hover:text-white">{useCase.title}</a>)}
            <a href="#tools" className="underline decoration-[#dfb89f]/60 underline-offset-4 transition hover:text-white">All tools at a glance</a>
          </nav>
        </div>
      </section>

      {guideCopy.useCases.map((useCase, index) => (
        <section key={useCase.id} id={useCase.id} aria-labelledby={`${useCase.id}-heading`} className={`scroll-mt-8 px-5 py-16 sm:px-8 sm:py-20 ${index % 2 ? "border-y border-[#302821]/10 bg-[#fffaf3]" : ""}`}>
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className={eyebrow}>Best for</p>
              <h2 id={`${useCase.id}-heading`} className={`${sectionHeading} max-w-sm`}>{useCase.title}</h2>
              <p className="mt-6 max-w-sm text-sm leading-7 text-[#6d6055]">{useCase.intro}</p>
            </div>
            <div>
              <ol className="border-t border-[#302821]/15">
                {useCase.picks.map((pick, position) => {
                  const competitor = getCompetitor(pick.slug);
                  if (!competitor) return null;
                  return (
                    <li key={pick.slug} className="grid gap-2 border-b border-[#302821]/15 py-5 sm:grid-cols-[2.5rem_1fr_auto] sm:items-start sm:gap-5">
                      <span className="text-[12px] font-semibold tracking-[0.14em] text-[#8a6153] sm:pt-1">0{position + 1}</span>
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.02em]">{competitor.name}</h3>
                        <p className="mt-1 text-sm leading-7 text-[#6d6055]">{pick.why}</p>
                      </div>
                      <Link href={comparePath(competitor.slug)} className={`text-sm font-semibold text-[#302821] ${textLink}`}>vs Eventloom</Link>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-6 rounded-2xl border border-[#302821]/10 bg-[#eff2e9] p-5 text-sm leading-7 text-[#5f5248]"><span className="font-semibold text-[#302821]">Where Eventloom fits: </span>{useCase.eventloom}</p>
            </div>
          </div>
        </section>
      ))}

      <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-8 bg-[#302821] px-5 py-16 text-[#fff9f2] sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">At a glance</p>
          <h2 id="tools-heading" className="mt-5 max-w-2xl font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">Every tool in this guide, with its price and catch.</h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {competitors.map((competitor) => (
              <li key={competitor.slug} className="rounded-2xl border border-white/15 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#dfb89f]">{competitor.category}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em]">{competitor.name}</h3>
                <dl className="mt-4 grid gap-3 text-sm leading-6 text-[#eadbd0]/80">
                  <div><dt className="font-semibold text-[#fff9f2]">Price</dt><dd>{competitor.guide.pricing}</dd></div>
                  <div><dt className="font-semibold text-[#fff9f2]">Best for</dt><dd>{competitor.guide.bestFor}</dd></div>
                  <div><dt className="font-semibold text-[#fff9f2]">Watch out for</dt><dd>{competitor.guide.watchOut}</dd></div>
                </dl>
                <Link href={comparePath(competitor.slug)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#fff9f2] underline decoration-[#dfb89f]/60 underline-offset-4 transition hover:text-white">Eventloom vs {competitor.name} <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </li>
            ))}
            <li className="rounded-2xl bg-[#fffaf3] p-6 text-[#302821]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6153]">AI event website and RSVP builder · publisher of this guide</p>
              <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em]">Eventloom</h3>
              <dl className="mt-4 grid gap-3 text-sm leading-6 text-[#5f5248]">
                <div><dt className="font-semibold text-[#302821]">Price</dt><dd>{guideCopy.eventloomEntry.pricing}</dd></div>
                <div><dt className="font-semibold text-[#302821]">Best for</dt><dd>{guideCopy.eventloomEntry.bestFor}</dd></div>
                <div><dt className="font-semibold text-[#302821]">Watch out for</dt><dd>{guideCopy.eventloomEntry.watchOut}</dd></div>
              </dl>
              <Link href="/#create" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#302821] underline decoration-[#c19a7d] underline-offset-4 transition hover:text-[#8a6153]">Describe your event <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </li>
          </ul>
        </div>
      </section>

      <FaqSection heading="RSVP website builder FAQ." faqs={guideCopy.faqs} />

      <SourcesList sources={sources} checkedAt={checkedAt} note="Eventloom publishes this guide. Competitor details come from each company’s own pricing, product, and help pages on the date above; we left out anything we couldn’t confirm there. Plans and prices change, so check before you decide, and tell us at hello@eventloom.co if something is out of date." />

      <section className="border-t border-[#302821]/10 px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#6d6055]">
          <span className="font-semibold text-[#302821]">Explore more:</span>
          <Link href={COMPARE_PATH} className={textLink}>All comparisons</Link>
          <Link href="/templates" className={textLink}>Event website templates</Link>
          <Link href="/rsvp-website" className={textLink}>RSVP website builder</Link>
        </div>
      </section>
    </main>
  );
}
