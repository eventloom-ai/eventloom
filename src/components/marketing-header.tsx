import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  ["Templates", "/templates"],
  ["Event websites", "/event-website-builder"],
  ["RSVP websites", "/rsvp-website"],
  ["Contact", "/contact"],
] as const;

export const marketingHeaderCtaClass = "shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#302821] transition hover:bg-[#fffaf3]";

/** Dark top bar shared by the SEO landing pages and the template pages. Server-rendered; `cta` replaces the default link. */
export function MarketingHeader({ ctaHref = "/#create", ctaLabel = "Create an event", cta }: { ctaHref?: string; ctaLabel?: string; cta?: ReactNode }) {
  return (
    <header className="border-b border-[#302821]/10 bg-[#302821] text-white">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="text-[15px] font-semibold text-white" aria-label="Eventloom home">Eventloom</Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 text-[13px] text-white/70 md:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="transition hover:text-white">{label}</Link>)}
        </nav>
        {cta ?? <Link href={ctaHref} className={marketingHeaderCtaClass}>{ctaLabel}</Link>}
      </div>
    </header>
  );
}
