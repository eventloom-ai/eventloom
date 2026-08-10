import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_VERSION, legalDocument, legalDocuments } from "@/lib/legal-documents";

export function generateStaticParams() { return legalDocuments.map((document) => ({ document: document.slug })); }

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document: slug } = await params;
  const document = legalDocument(slug);
  if (!document) notFound();
  return <main className="eventloom-app min-h-screen px-5 py-16 sm:px-8"><article className="mx-auto max-w-3xl"><Link href="/legal" className="font-[family-name:var(--font-playfair)] text-lg font-medium tracking-[-0.04em]">Eventloom</Link><p className="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Version {LEGAL_VERSION} · Pre-launch legal review required</p><h1 className="mt-4 font-[family-name:var(--font-playfair)] text-5xl font-medium leading-[0.92] tracking-[-0.055em] sm:text-6xl">{document.title}</h1><p className="mt-6 text-lg leading-8 text-[#6d6055]">{document.summary}</p><div className="mt-14 grid gap-10 border-t border-[#302821]/15 pt-10">{document.sections.map((section) => <section key={section.heading}><h2 className="font-[family-name:var(--font-playfair)] text-3xl font-medium tracking-[-0.04em]">{section.heading}</h2><p className="mt-4 leading-7 text-[#574239]">{section.body}</p></section>)}</div><p className="mt-14 rounded-2xl bg-[#f3e7d9] p-5 text-sm leading-6 text-[#604139]">This pre-launch document records the intended product rules. It is not represented as lawyer-approved. Paid public launch remains disabled until Ontario/US legal review and the final business identity and contact details are published.</p></article></main>;
}
