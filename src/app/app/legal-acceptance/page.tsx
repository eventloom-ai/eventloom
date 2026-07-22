import { redirect } from "next/navigation";
import { LegalAcceptanceForm } from "@/components/legal-acceptance-form";
import { LEGAL_VERSION } from "@/lib/legal-documents";
import { getAuthContext } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

export default async function LegalAcceptancePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/app/legal-acceptance");
  return <main className="min-h-screen bg-[#fbfbfd] px-6 py-16"><div className="mx-auto max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">Creator onboarding</p><h1 className="mt-3 text-4xl font-semibold">Confirm the creator terms</h1><p className="mt-4 leading-7 text-[#6e6e73]">Publishing remains unavailable until your verified account records the reviewed legal version and age confirmation.</p><LegalAcceptanceForm version={LEGAL_VERSION} /></div></main>;
}
