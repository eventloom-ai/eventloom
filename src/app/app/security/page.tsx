import { redirect } from "next/navigation";
import { MfaSettings } from "@/components/mfa-settings";
import { AccountDataControls } from "@/components/account-data-controls";
import { getAuthContext } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/app/security");
  const query = await searchParams;
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><div className="mx-auto max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">Account security</p><h1 className="mt-3 text-4xl font-semibold">Protect your Eventloom account</h1>{!auth.emailVerified || query.reason === "email" ? <p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-900">Confirm your email before using protected creator features.</p> : null}<div className="mt-8"><MfaSettings nextPath={query.next} /></div><AccountDataControls /></div></main>;
}
