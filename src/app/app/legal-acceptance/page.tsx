import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LegalAcceptanceForm } from "@/components/legal-acceptance-form";
import { LEGAL_VERSION } from "@/lib/legal-documents";
import { getAuthContext } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

export default async function LegalAcceptancePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/app/legal-acceptance");
  return <AppShell width="narrow" title="Confirm the creator terms" description="Publishing remains unavailable until your verified account records the reviewed legal version and age confirmation."><LegalAcceptanceForm version={LEGAL_VERSION} /></AppShell>;
}
