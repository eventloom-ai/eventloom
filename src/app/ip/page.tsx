import Link from "next/link";
import { env } from "@/lib/env";

export default function IpPage() {
  const email = env.legalContactEmail();
  return <main className="eventloom-app min-h-screen px-5 py-16 sm:px-8"><section className="mx-auto max-w-2xl"><Link href="/" className="font-[family-name:var(--font-playfair)] text-lg font-medium tracking-[-0.04em]">Eventloom</Link><p className="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Rights and reporting</p><h1 className="mt-4 font-[family-name:var(--font-playfair)] text-5xl font-medium leading-[0.92] tracking-[-0.055em]">Intellectual-property complaints</h1><p className="mt-6 leading-7 text-[#574239]">A rights holder may report allegedly infringing event content with identification of the protected work, the specific Eventloom URL, contact information, a good-faith statement, and confirmation that the report is accurate and authorized.</p><p className="mt-5 leading-7 text-[#574239]">Eventloom may remove or restrict content while reviewing a complete notice and may forward the notice to the creator. Misrepresentations may have legal consequences.</p>{!email.endsWith(".invalid") ? <a className="mt-8 inline-block font-medium text-[#604139] underline decoration-[#c19a7d] underline-offset-4" href={`mailto:${email}?subject=Intellectual-property%20complaint`}>Send a complaint</a> : null}</section></main>;
}
