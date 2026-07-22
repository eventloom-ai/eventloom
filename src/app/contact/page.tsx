import Link from "next/link";
import { env } from "@/lib/env";

export default function ContactPage() {
  const email = env.legalContactEmail();
  const configured = !email.endsWith(".invalid");
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><section className="mx-auto max-w-2xl"><Link href="/" className="text-sm font-semibold">Eventloom</Link><h1 className="mt-10 text-5xl font-semibold">Contact and support</h1><p className="mt-5 text-lg leading-8 text-[#6e6e73]">Use this channel for support, privacy requests, accessibility accommodations, and intellectual-property complaints. Include only the minimum information needed; never send passwords, card numbers, authenticator codes, or secret keys.</p>{configured ? <a href={`mailto:${email}`} className="mt-8 inline-block rounded-full bg-[#1d1d1f] px-6 py-3 text-white">Email {email}</a> : <p className="mt-8 rounded-xl bg-amber-50 p-4 text-amber-950">A monitored business support address and non-home mailing address must be configured before public payments are enabled.</p>}<div className="mt-10 grid gap-3 text-sm"><Link className="underline" href="/privacy/request">Submit a privacy request</Link><Link className="underline" href="/legal/accessibility">Accessibility support</Link><Link className="underline" href="/ip">Intellectual-property complaint process</Link></div></section></main>;
}
