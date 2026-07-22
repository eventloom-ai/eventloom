import Link from "next/link";
import { env } from "@/lib/env";

export default function IpPage() {
  const email = env.legalContactEmail();
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><section className="mx-auto max-w-2xl"><Link href="/" className="text-sm font-semibold">Eventloom</Link><h1 className="mt-10 text-5xl font-semibold">Intellectual-property complaints</h1><p className="mt-5 leading-7 text-[#424245]">A rights holder may report allegedly infringing event content with identification of the protected work, the specific Eventloom URL, contact information, a good-faith statement, and confirmation that the report is accurate and authorized.</p><p className="mt-5 leading-7 text-[#424245]">Eventloom may remove or restrict content while reviewing a complete notice and may forward the notice to the creator. Misrepresentations may have legal consequences.</p>{!email.endsWith(".invalid") ? <a className="mt-8 inline-block underline" href={`mailto:${email}?subject=Intellectual-property%20complaint`}>Send a complaint</a> : null}</section></main>;
}
