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
    <main className="eventloom-app min-h-screen px-5 py-16 sm:px-8">
      <section className="mx-auto max-w-2xl">
        <Link href="/" className="font-[family-name:var(--font-playfair)] text-lg font-medium tracking-[-0.04em]">Eventloom</Link>
        <p className="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Here to help</p>
        <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-5xl font-medium leading-[0.92] tracking-[-0.055em] sm:text-6xl">Contact and support</h1>
        <p className="mt-6 text-lg leading-8 text-[#6d6055]">
          Tell us what you need in plain language. Support messages go to Eventloom’s private feedback queue.
        </p>

        <div className="eventloom-app-card mt-10 rounded-[1.5rem] p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-medium tracking-[-0.04em]">How can we help?</h2>
          <p className="mt-3 text-sm leading-6 text-[#6d6055]">
            Include the page you were using and what you expected to happen. Please do not send guest names, addresses, card details, passwords, or security codes.
          </p>
          <div className="mt-5">
            {configured ? (
              <a href={`mailto:${email}`} className="eventloom-app-button-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition">
                Email {email}
              </a>
            ) : (
              <OpenFeedbackButton />
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-3 text-sm">
          <Link className="font-medium text-[#604139] underline decoration-[#c19a7d] underline-offset-4" href="/privacy/request">Submit a privacy request</Link>
          <Link className="font-medium text-[#604139] underline decoration-[#c19a7d] underline-offset-4" href="/legal/accessibility">Accessibility support</Link>
          <Link className="font-medium text-[#604139] underline decoration-[#c19a7d] underline-offset-4" href="/ip">Intellectual-property complaint process</Link>
        </div>
      </section>
    </main>
  );
}
