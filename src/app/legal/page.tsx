import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_BUSINESS, LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, legalDocuments } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "Policies",
  description: "Eventloom's terms, privacy, refund, acceptable use, reporting, copyright, cookie, accessibility and security policies.",
  alternates: { canonical: "/legal" },
};

export default function LegalIndexPage() {
  return (
    <main className="min-h-screen bg-[#fbfbfd] px-6 py-16">
      <section className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold">Eventloom</Link>
        <p className="mt-10 text-sm uppercase tracking-[0.18em] text-[#6e6e73]">Version {LEGAL_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Policies</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6e6e73]">The rules for using Eventloom, how we handle personal information, refunds, and how to report a problem. Questions: <a className="underline underline-offset-4" href={`mailto:${LEGAL_BUSINESS.email}`}>{LEGAL_BUSINESS.email}</a>.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {legalDocuments.map((document) => (
            <Link key={document.slug} href={`/legal/${document.slug}`} className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="font-semibold">{document.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{document.summary}</p>
            </Link>
          ))}
          <Link href="/privacy/request" className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="font-semibold">Make a privacy request</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">Ask to access, correct or delete personal information held by Eventloom or an event host.</p>
          </Link>
        </div>
        <p className="mt-10 text-sm leading-6 text-[#6e6e73]">{LEGAL_BUSINESS.name} · {LEGAL_BUSINESS.mailingAddress}</p>
      </section>
    </main>
  );
}
