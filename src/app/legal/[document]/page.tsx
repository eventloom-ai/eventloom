import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_VERSION, legalDocument, legalDocuments } from "@/lib/legal-documents";

export function generateStaticParams() { return legalDocuments.map((document) => ({ document: document.slug })); }

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document: slug } = await params;
  const document = legalDocument(slug);
  if (!document) notFound();
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><article className="mx-auto max-w-3xl"><Link href="/" className="text-sm font-semibold">Eventloom</Link><p className="mt-10 text-sm uppercase tracking-[0.18em] text-[#6e6e73]">Version {LEGAL_VERSION} · Pre-launch legal review required</p><h1 className="mt-3 text-5xl font-semibold tracking-tight">{document.title}</h1><p className="mt-5 text-lg leading-relaxed text-[#6e6e73]">{document.summary}</p><div className="mt-12 grid gap-10">{document.sections.map((section) => <section key={section.heading}><h2 className="text-2xl font-semibold">{section.heading}</h2><p className="mt-3 leading-7 text-[#424245]">{section.body}</p></section>)}</div><p className="mt-14 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">This pre-launch document records the intended product rules. It is not represented as lawyer-approved. Paid public launch remains disabled until Ontario/US legal review and the final business identity and contact details are published.</p></article></main>;
}
