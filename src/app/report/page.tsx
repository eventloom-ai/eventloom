import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AbuseReportForm } from "@/components/abuse-report-form";
import { env, rootDomain } from "@/lib/env";

export const metadata: Metadata = {
  title: "Report a page",
  description: "Report an Eventloom event page for phishing, scams, hate, harassment, sexual or violent content, impersonation, copyright, or privacy concerns.",
  robots: { index: false },
};

// Prerendered for every visitor: the event comes from ?event=<slug>, read in the browser by the form.
export default function ReportPage() {
  return (
    <main className="min-h-screen bg-[#fbfbfd] px-6 py-16">
      <section className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold">Eventloom</Link>
        <h1 className="mt-10 text-4xl font-semibold tracking-tight sm:text-5xl">Report a page</h1>
        <p className="mt-5 leading-7 text-[#424245]">
          Eventloom hosts event pages that people make themselves. If a page tries to collect passwords, payment or bank details, impersonates someone, or shows hateful, sexual, violent or private content, tell us here. Reports are reviewed by Eventloom and may lead to the page being taken down under the{" "}
          <Link href="/legal/acceptable-use" className="underline underline-offset-4">Acceptable Use Policy</Link>.
        </p>
        <p className="mt-4 text-sm leading-6 text-[#6e6e73]">
          Never enter passwords or card numbers on an event page. We don’t share your email with the event’s host. For a formal copyright notice see the{" "}
          <Link href="/ip" className="underline underline-offset-4">intellectual-property process</Link>.
        </p>
        <Suspense fallback={null}>
          <AbuseReportForm siteKey={env.turnstileSiteKey()} host={rootDomain()} />
        </Suspense>
      </section>
    </main>
  );
}
