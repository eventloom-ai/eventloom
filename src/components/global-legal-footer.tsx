import Link from "next/link";

const links = [["All policies", "/legal"], ["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Cookie preferences", "/legal/cookies#preferences"], ["Domains", "/legal/domains"], ["Accessibility", "/legal/accessibility"], ["Security", "/legal/security"], ["Contact", "/contact"]] as const;

export function GlobalLegalFooter() {
  return <footer className="border-t border-black/10 bg-[#fbfbfd] px-6 py-8 text-[#424245]"><nav aria-label="Legal and support" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 text-sm"><span className="font-semibold text-[#1d1d1f]">Eventloom</span>{links.map(([label, href]) => <Link key={href} href={href} className="underline-offset-4 hover:underline">{label}</Link>)}</nav></footer>;
}
