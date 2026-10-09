import Link from "next/link";
import type { ReactNode } from "react";
import { formatCheckedMonth, type ComparisonSource } from "@/lib/comparisons";
import type { FaqItem } from "@/lib/structured-data";

// Shared, server-only building blocks for the comparison pages and the RSVP builders guide. No client JavaScript.

export const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]";
export const sectionHeading = "mt-5 font-[family-name:var(--font-playfair)] text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl";
export const textLink = "underline decoration-[#c19a7d] underline-offset-4 transition hover:text-[#8a6153]";

export function Breadcrumbs({ items }: { items: readonly { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-[#eadbd0]/60">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={item.name} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? <Link href={item.href} className="transition hover:text-white">{item.name}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined} className="text-[#eadbd0]/85">{item.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BulletList({ title, items, tone = "light" }: { title: string; items: readonly string[]; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className={dark ? "rounded-[1.5rem] bg-[#302821] p-6 text-[#fff9f2] sm:p-8" : "rounded-[1.5rem] border border-[#302821]/10 bg-[#fffaf3] p-6 shadow-[0_10px_30px_rgba(65,43,28,0.05)] sm:p-8"}>
      <h3 className="text-xl font-semibold tracking-[-0.025em]">{title}</h3>
      <ul className={`mt-5 space-y-3 border-t pt-5 text-sm leading-7 ${dark ? "border-white/15 text-[#eadbd0]/80" : "border-[#302821]/10 text-[#5f5248]"}`}>
        {items.map((item) => <li key={item} className="flex gap-3"><span aria-hidden="true" className={dark ? "text-[#dfb89f]" : "text-[#a37561]"}>—</span><span>{item}</span></li>)}
      </ul>
    </div>
  );
}

export function FaqSection({ heading, faqs }: { heading: string; faqs: readonly FaqItem[] }) {
  return (
    <section aria-labelledby="faq-heading" className="border-y border-[#302821]/10 bg-[#eff2e9] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className={eyebrow}>Questions, answered</p>
          <h2 id="faq-heading" className={`${sectionHeading} max-w-sm`}>{heading}</h2>
        </div>
        <div className="border-t border-[#302821]/15">
          {faqs.map((faq) => (
            <details key={faq.question} className="group border-b border-[#302821]/15 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold marker:content-none">{faq.question}<span aria-hidden="true" className="text-xl font-normal text-[#a37561] transition group-open:rotate-45">+</span></summary>
              <p className="max-w-2xl pt-4 text-sm leading-7 text-[#6d6055]">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SourcesList({ sources, checkedAt, note }: { sources: readonly ComparisonSource[]; checkedAt: string; note?: ReactNode }) {
  return (
    <section aria-labelledby="sources-heading" className="px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl text-sm text-[#6d6055]">
        <h2 id="sources-heading" className="text-sm font-semibold text-[#302821]">Sources, checked <time dateTime={checkedAt}>{formatCheckedMonth(checkedAt)}</time></h2>
        <ul className="mt-3 grid gap-1.5 text-[13px] leading-6">
          {sources.map((source) => (
            <li key={source.url}><a href={source.url} rel="nofollow noopener" target="_blank" className={`${textLink} break-words`}>{source.label}</a></li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-[13px] leading-6 text-[#796c61]">{note ?? "Competitor details come from each company’s own pricing, product, and help pages on the date above. Plans and prices change, so confirm on their site before you decide. Spot something out of date? Tell us at hello@eventloom.co and we will fix it."}</p>
      </div>
    </section>
  );
}
