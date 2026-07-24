import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AccountDataControls } from "@/components/account-data-controls";
import { ProfileForm } from "@/components/profile-form";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readableDate(value: string | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function ProfilePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/app/profile");
  const client = await createSupabaseServerClient();
  const profile = client
    ? await client.from("profiles").select("full_name, created_at").eq("id", auth.user.id).maybeSingle()
    : null;
  const fullName =
    profile?.data?.full_name?.trim() ||
    (auth.user.user_metadata.full_name as string | undefined)?.trim() ||
    auth.user.email?.split("@")[0] ||
    "Event creator";
  const email = auth.user.email || "No email available";
  const mfaReady = hasRequiredMfa(auth);
  const mfaEnrolled = auth.nextAal === "aal2";

  return (
    <AppShell
      active="profile"
      width="narrow"
      title="Your profile"
      description="Manage your account, security, and personal data in one place."
      action={<Link href="/app" className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white">My events</Link>}
    >
      <div className="grid gap-6">
        <ProfileForm initialName={fullName} />

        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="text-xl font-semibold">Account details</h2>
          <dl className="mt-5 divide-y divide-black/[0.06]">
            <div className="grid gap-1 py-4 first:pt-0 sm:grid-cols-[9rem_1fr]">
              <dt className="text-sm text-[#6e6e73]">Email</dt>
              <dd className="break-all text-sm font-medium">{email}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr]">
              <dt className="text-sm text-[#6e6e73]">Email status</dt>
              <dd className={`text-sm font-medium ${auth.emailVerified ? "text-emerald-700" : "text-amber-700"}`}>
                {auth.emailVerified ? "Verified" : "Confirmation needed"}
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr]">
              <dt className="text-sm text-[#6e6e73]">Member since</dt>
              <dd className="text-sm font-medium">{readableDate(profile?.data?.created_at || auth.user.created_at)}</dd>
            </div>
          </dl>
          <p className="mt-1 text-xs leading-5 text-[#86868b]">Your sign-in email is managed by your authentication provider and is never shown on public event pages.</p>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Security</h2>
              <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                {mfaReady
                  ? "This session has completed two-step verification."
                  : mfaEnrolled
                    ? "Your authenticator is enrolled. Verify this session before sensitive actions."
                    : "Set up an authenticator before publishing, billing, exports, or domain changes."}
              </p>
            </div>
            <Link href="/app/security?next=/app/profile" className="shrink-0 rounded-full bg-[#1d1d1f] px-5 py-3 text-center text-sm font-medium text-white">
              {mfaReady ? "Security settings" : mfaEnrolled ? "Verify session" : "Set up security"}
            </Link>
          </div>
        </section>

        <AccountDataControls />

        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="text-xl font-semibold">Sign out</h2>
          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">Sign out when you are using a shared or public device.</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="mt-5 rounded-full border border-black/15 px-5 py-3 text-sm font-medium transition hover:bg-[#f5f5f7]">Sign out of Eventloom</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
