import Link from "next/link";
import { env } from "@/lib/env";
import { PrivacyRequestForm } from "@/components/privacy-request-form";

export default function PrivacyRequestPage() {
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><section className="mx-auto max-w-2xl"><Link href="/legal/privacy" className="text-sm font-semibold">Privacy Policy</Link><h1 className="mt-10 text-5xl font-semibold">Privacy request</h1><p className="mt-5 leading-7 text-[#424245]">You may request access, correction, deletion, or information about RSVP or account data. Eventloom or the event creator will verify identity before disclosing or changing information and targets a response within 30 days.</p><p className="mt-5 leading-7 text-[#424245]">Provide only the minimum information needed. Do not include passwords, payment card information, or authenticator codes. Your contact and request details are encrypted at rest.</p><PrivacyRequestForm siteKey={env.turnstileSiteKey()} /></section></main>;
}
