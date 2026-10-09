import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { MarketingHeader, marketingHeaderCtaClass } from "@/components/marketing-header";
import { TemplateStartLink } from "@/components/template-start-link";
import { TemplateSitePreview, TemplateThumbnail } from "@/components/template-preview";
import { comparisonLinksFor } from "@/lib/comparisons";
import { appUrl, publicSignupEnabled } from "@/lib/env";
import { getOccasionTemplate, occasionPath, occasionTemplateBrief, TEMPLATES_PATH, type OccasionTemplate } from "@/lib/occasion-templates";
import { seoLandingPages, type SeoLandingPage } from "@/lib/seo-landing-pages";
import { absoluteUrl, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/structured-data";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]";
const sectionHeading = "mt-5 font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl";
const textLink = "underline decoration-[#c19a7d] underline-offset-4 transition hover:text-[#8a6153]";

function landingPage(slug: string): SeoLandingPage | null {
  return (seoLandingPages as Record<string, SeoLandingPage>)[slug] ?? null;
}

export function OccasionTemplatePage({ occasion }: { occasion: OccasionTemplate }) {
  const siteUrl = appUrl();
  const path = occasionPath(occasion.slug);
  // Read at build time: template pages are static, and the signed-in check happens in the browser (TemplateStartLink).
  const entry = { authConfigured: hasSupabasePublicEnv(), signupEnabled: publicSignupEnabled() };
  const startBrief = occasionTemplateBrief(occasion);
  const related = occasion.related.map(getOccasionTemplate).filter((item): item is OccasionTemplate => Boolean(item));
  const guides = occasion.landingPages.map(landingPage).filter((item): item is SeoLandingPage => Boolean(item));
  const lowerName = occasion.name.toLowerCase();

  return (
    <main className="overflow-hidden bg-[#e7ecdf] text-[#302821]">
      <JsonLd data={[
        faqPageJsonLd(occasion.faqs, absoluteUrl(siteUrl, path)),
        breadcrumbJsonLd(siteUrl, [{ name: "Eventloom", path: "/" }, { name: "Templates", path: TEMPLATES_PATH }, { name: occasion.name, path }]),
      ]} />
      <MarketingHeader cta={<TemplateStartLink brief={startBrief} {...entry} className={marketingHeaderCtaClass}>Use this template</TemplateStartLink>} />

      <section className="bg-[#302821] px-5 pb-16 pt-10 text-[#fff9f2] sm:px-8 sm:pb-24 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-[13px] text-[#eadbd0]/60">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href={TEMPLATES_PATH} className="transition hover:text-white">Templates</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-[#eadbd0]/85">{occasion.name}</li>
            </ol>
          </nav>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">{occasion.name} website template</p>
              <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-playfair)] text-5xl leading-[0.94] tracking-[-0.055em] sm:text-7xl">{occasion.heading}</h1>
            </div>
            <div>
              <p className="max-w-xl text-base leading-8 text-[#eadbd0]/75">{occasion.intro}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <TemplateStartLink brief={startBrief} {...entry} className="inline-flex items-center gap-2 rounded-full bg-[#fffaf3] px-6 py-3.5 text-sm font-semibold text-[#302821] transition hover:bg-white">Use this template <ArrowRight className="size-4" aria-hidden="true" /></TemplateStartLink>
                <a href="#what-to-include" className="text-sm font-semibold text-[#eadbd0]/80 underline decoration-[#dfb89f]/60 underline-offset-4 transition hover:text-white">Read the planning guide</a>
              </div>
              <p className="mt-5 text-[13px] leading-6 text-[#eadbd0]/55">Draft it first · $20 once to publish for a year · Guests reply without an account</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="preview-heading" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className={eyebrow}>Live sample</p>
              <h2 id="preview-heading" className={sectionHeading}>A {lowerName} page, built by Eventloom.</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#6d6055]">This is the same renderer guests see on a published event. Your version starts from your own details and can be changed in plain language.</p>
          </div>
          <TemplateSitePreview occasion={occasion} />
          {occasion.styles.length > 1 ? (
            <div className="mt-14">
              <h3 className="text-xl font-semibold tracking-[-0.025em]">Pick a starting style</h3>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {occasion.styles.map((style, index) => (
                  <li key={style.mood} className="overflow-hidden rounded-2xl border border-[#302821]/10 bg-[#fffaf3] shadow-[0_10px_30px_rgba(65,43,28,0.05)]">
                    <TemplateThumbnail occasion={occasion} styleIndex={index} />
                    <div className="flex items-center justify-between gap-4 border-t border-[#302821]/10 p-5">
                      <div>
                        <p className="font-semibold">{style.name}</p>
                        <p className="mt-1 text-xs capitalize text-[#74675d]">{style.mood} palette{index === 0 ? " · shown above" : ""}</p>
                      </div>
                      <TemplateStartLink brief={occasionTemplateBrief(occasion, style.mood)} {...entry} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#302821] transition hover:text-[#8a6153]" ariaLabel={`Start a ${lowerName} site in the ${style.name} style`}>Start <ArrowRight className="size-4" aria-hidden="true" /></TemplateStartLink>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section id="what-to-include" aria-labelledby="include-heading" className="scroll-mt-8 border-y border-[#302821]/10 bg-[#fffaf3] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className={eyebrow}>Planning guide</p>
            <h2 id="include-heading" className={`${sectionHeading} max-w-sm`}>What to include on a {lowerName} website.</h2>
          </div>
          <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {occasion.include.map((item) => (
              <li key={item.title} className="border-t border-[#302821]/15 pt-5">
                <h3 className="text-base font-semibold tracking-[-0.015em]">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#6d6055]">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="schedule-heading" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className={eyebrow}>Sample schedule</p>
            <h2 id="schedule-heading" className={`${sectionHeading} max-w-sm`}>How the day could run.</h2>
            <p className="mt-6 max-w-sm text-sm leading-7 text-[#6d6055]">{occasion.scheduleNote}</p>
          </div>
          <ol className="border-t border-[#302821]/15">
            {occasion.schedule.map((item) => (
              <li key={`${item.time}-${item.title}`} className="grid gap-2 border-b border-[#302821]/15 py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8a6153] sm:pt-1">{item.time}</p>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.02em]">{item.title}{item.location ? <span className="font-normal text-[#74675d]"> · {item.location}</span> : null}</h3>
                  {item.description ? <p className="mt-1 text-sm leading-7 text-[#6d6055]">{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="rsvp-heading" className="bg-[#302821] px-5 py-16 text-[#fff9f2] sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">RSVP questions</p>
            <h2 id="rsvp-heading" className="mt-5 max-w-sm font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">Ask only what helps you plan.</h2>
            <p className="mt-6 max-w-sm text-sm leading-7 text-[#eadbd0]/70">The RSVP form has built-in fields for attendance, party size, guest names, email, phone, and meal preference, plus a free-text note. For anything else, ask in the RSVP description and guests answer in the note.</p>
          </div>
          <ul className="border-t border-white/15">
            {occasion.rsvpQuestions.map((item) => (
              <li key={item.question} className="flex flex-col gap-2 border-b border-white/15 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                <div>
                  <h3 className="text-base font-semibold">{item.question}</h3>
                  <p className="mt-1 text-sm leading-7 text-[#eadbd0]/65">{item.why}</p>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-white/20 px-3 py-1 text-[11px] font-medium text-[#eadbd0]/80">{item.field && item.field !== "note" ? "Built-in field" : "Ask in the note"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="wording-heading" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className={eyebrow}>Wording tips</p>
            <h2 id="wording-heading" className={`${sectionHeading} max-w-sm`}>Say it clearly, and kindly.</h2>
          </div>
          <ul className="grid gap-4">
            {occasion.wording.map((item) => (
              <li key={item.tip} className="rounded-2xl border border-[#302821]/10 bg-[#fffaf3] p-5 shadow-[0_10px_30px_rgba(65,43,28,0.05)]">
                <p className="text-sm leading-7 text-[#5f5248]">{item.tip}</p>
                {item.example ? <blockquote className="mt-3 border-l-2 border-[#c19a7d] pl-4 font-[family-name:var(--font-playfair)] text-lg italic leading-7 text-[#302821]">{item.example}</blockquote> : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="border-y border-[#302821]/10 bg-[#eff2e9] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className={eyebrow}>Questions, answered</p>
            <h2 id="faq-heading" className={`${sectionHeading} max-w-sm`}>{occasion.name} website FAQ.</h2>
          </div>
          <div className="border-t border-[#302821]/15">
            {occasion.faqs.map((faq) => (
              <details key={faq.question} className="group border-b border-[#302821]/15 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold marker:content-none">{faq.question}<span aria-hidden="true" className="text-xl font-normal text-[#a37561] transition group-open:rotate-45">+</span></summary>
                <p className="max-w-2xl pt-4 text-sm leading-7 text-[#6d6055]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl border-y border-[#302821]/15 py-14 text-center sm:py-20">
          <p className={eyebrow}>Start with this template</p>
          <h2 className="mx-auto mt-5 max-w-3xl font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-6xl">Make your {lowerName} page in a minute.</h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#6d6055]">The brief is filled in for you. Add your names, date, and place, review the draft, and publish when you are ready.</p>
          <TemplateStartLink brief={startBrief} {...entry} className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#302821] px-6 py-3.5 text-sm font-semibold text-[#fffaf3] transition hover:bg-[#4a2d2a]">Use this template <ArrowRight className="size-4" aria-hidden="true" /></TemplateStartLink>
        </div>
      </section>

      <section aria-labelledby="related-heading" className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <h2 id="related-heading" className="text-xl font-semibold tracking-[-0.025em]">More templates</h2>
          <ul className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-[#302821]/10 bg-[#302821]/10 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug} className="bg-[#fffaf3]">
                <Link href={occasionPath(item.slug)} className="group flex h-full flex-col justify-between gap-5 p-6 transition hover:bg-white">
                  <span><span className="block text-base font-semibold tracking-[-0.02em]">{item.name} template</span><span className="mt-2 block text-sm leading-6 text-[#74675d]">{item.cardBlurb}</span></span>
                  <ArrowRight className="size-4 text-[#a37561] transition group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#6d6055]">
            <span className="font-semibold text-[#302821]">Explore more:</span>
            <Link href={TEMPLATES_PATH} className={textLink}>All templates</Link>
            {guides.map((guide) => <Link key={guide.slug} href={`/${guide.slug}`} className={textLink}>{guide.title}</Link>)}
            {comparisonLinksFor(occasion.slug).map((link) => <Link key={link.href} href={link.href} className={textLink}>{link.label}</Link>)}
          </div>
        </div>
      </section>
    </main>
  );
}
