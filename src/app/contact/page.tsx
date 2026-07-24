import type { Metadata } from "next";
import Link from "next/link";
import { OpenFeedbackButton } from "@/components/open-feedback-button";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact and Support",
  description: "Get help with Eventloom, privacy requests, accessibility accommodations, or intellectual-property concerns.",
};

export default function ContactPage() {
  const email = env.legalContactEmail();
  const configured = !email.endsWith(".invalid");

  return (
    <main className="min-h-screen bg-[#fbfbfd] px-6 py-16">
      <section className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold">Eventloom</Link>
        <h1 className="mt-10 text-4xl font-semibold tracking-tight sm:text-5xl">Contact and support</h1>
        <p className="mt-5 text-lg leading-8 text-[#6e6e73]">
          Tell us what you need in plain language. Support messages go to Eventloom’s private feedback queue.
        </p>

        <div className="mt-8 rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-semibold">How can we help?</h2>
          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            Include the page you were using and what you expected to happen. Please do not send guest names, addresses, card details, passwords, or security codes.
          </p>
          <div className="mt-5">
            {configured ? (
              <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1d1d1f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black">
                Email {email}
              </a>
            ) : (
              <OpenFeedbackButton />
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-3 text-sm">
          <Link className="font-medium text-violet-700 underline underline-offset-4" href="/privacy/request">Submit a privacy request</Link>
          <Link className="font-medium text-violet-700 underline underline-offset-4" href="/legal/accessibility">Accessibility support</Link>
          <Link className="font-medium text-violet-700 underline underline-offset-4" href="/ip">Intellectual-property complaint process</Link>
        </div>
      </section>
    </main>
  );
}
