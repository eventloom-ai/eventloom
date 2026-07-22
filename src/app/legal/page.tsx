import Link from "next/link";
import { LEGAL_VERSION, legalDocuments } from "@/lib/legal-documents";

export default function LegalIndexPage() {
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><section className="mx-auto max-w-4xl"><Link href="/" className="text-sm font-semibold">Eventloom</Link><p className="mt-10 text-sm uppercase tracking-[0.18em] text-[#6e6e73]">Version {LEGAL_VERSION}</p><h1 className="mt-3 text-5xl font-semibold">Legal and trust centre</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[#6e6e73]">Pre-launch policies, privacy commitments, accessibility information, and security reporting guidance.</p><div className="mt-10 grid gap-4 sm:grid-cols-2">{legalDocuments.map((document) => <Link key={document.slug} href={`/legal/${document.slug}`} className="rounded-2xl border border-black/10 bg-white p-5"><h2 className="font-semibold">{document.title}</h2><p className="mt-2 text-sm leading-6 text-[#6e6e73]">{document.summary}</p></Link>)}</div></section></main>;
}
