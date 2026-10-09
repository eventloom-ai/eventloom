import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_BUSINESS, LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, legalDocument, legalDocuments, legalSectionBlocks } from "@/lib/legal-documents";

export function generateStaticParams() { return legalDocuments.map((document) => ({ document: document.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }): Promise<Metadata> {
  const document = legalDocument((await params).document);
  if (!document) return {};
  return { title: document.title, description: document.summary, alternates: { canonical: `/legal/${document.slug}` } };
}

function sectionId(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document: slug } = await params;
  const document = legalDocument(slug);
  if (!document) notFound();
  return (
    <main className="min-h-screen bg-[#fbfbfd] px-6 py-16">
      <article className="mx-auto max-w-3xl">
        <nav className="flex gap-4 text-sm font-semibold"><Link href="/">Eventloom</Link><Link href="/legal" className="text-[#6e6e73]">All policies</Link></nav>
        <p className="mt-10 text-sm uppercase tracking-[0.18em] text-[#6e6e73]">Version {LEGAL_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{document.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-[#6e6e73]">{document.summary}</p>
        {document.sections.length > 4 ? (
          <nav aria-label="On this page" className="mt-8 rounded-2xl border border-black/10 bg-white p-5 text-sm">
            <ol className="grid gap-1.5 sm:grid-cols-2">{document.sections.map((section) => <li key={section.heading}><a className="underline-offset-4 hover:underline" href={`#${sectionId(section.heading)}`}>{section.heading}</a></li>)}</ol>
          </nav>
        ) : null}
        <div className="mt-12 grid gap-10">
          {document.sections.map((section) => (
            <section key={section.heading} id={sectionId(section.heading)} className="scroll-mt-8">
              <h2 className="text-2xl font-semibold">{section.heading}</h2>
              {legalSectionBlocks(section.body).map((block, index) => block.kind === "list"
                ? <ul key={index} className="mt-3 grid list-disc gap-2 pl-6 leading-7 text-[#424245]">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
                : <p key={index} className="mt-3 whitespace-pre-line leading-7 text-[#424245]">{block.text}</p>)}
            </section>
          ))}
        </div>
        <footer className="mt-14 rounded-xl border border-black/10 bg-white p-5 text-sm leading-6 text-[#424245]">
          <p className="font-semibold text-[#1d1d1f]">{LEGAL_BUSINESS.name}</p>
          <p>{LEGAL_BUSINESS.mailingAddress}</p>
          <p><a className="underline underline-offset-4" href={`mailto:${LEGAL_BUSINESS.email}`}>{LEGAL_BUSINESS.email}</a></p>
          <p className="mt-3 text-[#6e6e73]">Earlier versions of this document are available on request.</p>
        </footer>
      </article>
    </main>
  );
}
