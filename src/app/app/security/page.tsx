import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MfaSettings } from "@/components/mfa-settings";
import { getAuthContext } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/app/security");
  const query = await searchParams;
  return (
    <AppShell
      active="profile"
      width="narrow"
      backHref="/app/profile"
      backLabel="Profile"
      title="Account security"
      description="Protect publishing, billing, guest data, and domain changes with two-step verification."
    >
      {!auth.emailVerified || query.reason === "email" ? <p className="mb-6 rounded-xl bg-amber-50 p-4 text-amber-900">Confirm your email before using protected creator features.</p> : null}
      <MfaSettings nextPath={query.next || "/app/profile"} />
    </AppShell>
  );
}
