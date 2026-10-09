import { redirect } from "next/navigation";
import { LegalAcceptanceForm } from "@/components/legal-acceptance-form";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, LEGAL_VERSION_CHANGES } from "@/lib/legal-version";
import { getAuthContext } from "@/lib/security/auth";
import { creatorLegalStatus } from "@/lib/security/creator-legal";

export const dynamic = "force-dynamic";

export default async function LegalAcceptancePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/app/legal-acceptance");
  const status = await creatorLegalStatus(auth.user.id);
  const updating = Boolean(status?.acceptedVersion && !status.current);
  // First-time acceptance continues to account security (publishing also needs MFA); re-acceptance returns to the app.
  const next = safeRedirectPath((await searchParams).next, updating ? "/app" : "/app/security");
  return (
    <main className="eventloom-app min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#155166]">{updating ? "Updated terms" : "Creator terms"}</p>
        <h1 className="mt-3 font-[family-name:var(--font-playfair)] text-4xl font-medium tracking-[-0.035em]">{updating ? "We've updated our terms" : "Confirm the creator terms"}</h1>
        <p className="mt-4 leading-7 text-[#66736c]">{status?.current ? `You have already accepted version ${LEGAL_VERSION}.` : `Version ${LEGAL_VERSION} takes effect ${LEGAL_EFFECTIVE_DATE}. You can keep drafting, but publishing needs your acceptance.`}</p>
        {updating ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold">What changed</h2>
            <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-sm leading-6 text-[#424245]">{LEGAL_VERSION_CHANGES.map((change) => <li key={change}>{change}</li>)}</ul>
          </section>
        ) : null}
        <LegalAcceptanceForm version={LEGAL_VERSION} next={next} />
      </div>
    </main>
  );
}
