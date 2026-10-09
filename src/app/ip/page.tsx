import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_BUSINESS } from "@/lib/legal-version";

export const metadata: Metadata = {
  title: "Intellectual-property complaints",
  description: "How to report copyright or trademark infringement on an Eventloom page.",
};

export default function IpPage() {
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><section className="mx-auto max-w-2xl"><Link href="/" className="text-sm font-semibold">Eventloom</Link><h1 className="mt-10 text-4xl font-semibold sm:text-5xl">Intellectual-property complaints</h1><p className="mt-5 leading-7 text-[#424245]">If an Eventloom event page uses your copyrighted work or trademark without permission, send us a notice with your contact details, the work, the exact page link, how it infringes, a good-faith statement and your signature. Our <Link className="underline underline-offset-4" href="/legal/copyright">Copyright and Takedown Policy</Link> lists everything a notice needs and explains how hosts can respond.</p><p className="mt-5 leading-7 text-[#424245]">We forward complete notices to the host as Canadian law requires and may remove clearly infringing material. Knowingly false notices can make the sender legally liable.</p><a className="mt-8 inline-block underline" href={`mailto:${LEGAL_BUSINESS.email}?subject=Copyright%20notice`}>Email a notice to {LEGAL_BUSINESS.email}</a><p className="mt-3 text-sm text-[#6e6e73]">Or by mail: {LEGAL_BUSINESS.name}, {LEGAL_BUSINESS.mailingAddress}</p></section></main>;
}
