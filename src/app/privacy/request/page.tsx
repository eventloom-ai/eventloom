import Link from "next/link";
import { env } from "@/lib/env";
import { PrivacyRequestForm } from "@/components/privacy-request-form";

export default function PrivacyRequestPage() {
  return <main className="eventloom-app min-h-screen px-5 py-16 sm:px-8"><section className="mx-auto max-w-2xl"><Link href="/legal/privacy" className="font-[family-name:var(--font-playfair)] text-lg font-medium tracking-[-0.04em]">Privacy Policy</Link><p className="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Your information</p><h1 className="mt-4 font-[family-name:var(--font-playfair)] text-5xl font-medium leading-[0.92] tracking-[-0.055em]">Privacy request</h1><p className="mt-6 leading-7 text-[#574239]">You may request access, correction, deletion, or information about RSVP or account data. Eventloom or the event creator will verify identity before disclosing or changing information and targets a response within 30 days.</p><p className="mt-5 leading-7 text-[#574239]">Provide only the minimum information needed. Do not include passwords, payment card information, or authenticator codes. Your contact and request details are encrypted at rest.</p><PrivacyRequestForm siteKey={env.turnstileSiteKey()} /></section></main>;
}
