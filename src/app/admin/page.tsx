import { demoEvents } from "@/lib/sample-data";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { recordAuditEvent } from "@/lib/security/audit";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { serviceSupabase } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadStats() {
  const client = serviceSupabase();
  if (!client) {
    return { events: demoEvents.length, domains: 0, payments: 0, failedJobs: 0 };
  }

  const [events, domains, payments, failedJobs] = await Promise.all([
    client.from("events").select("id", { count: "exact", head: true }),
    client.from("domains").select("id", { count: "exact", head: true }),
    client.from("payments").select("id", { count: "exact", head: true }),
    client.from("generation_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  return {
    events: events.count ?? 0,
    domains: domains.count ?? 0,
    payments: payments.count ?? 0,
    failedJobs: failedJobs.count ?? 0,
  };
}

export default async function AdminPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/admin");
  if (!auth.emailVerified) redirect("/app/security?reason=email");
  if (!hasRequiredMfa(auth)) redirect("/app/security?next=/admin");
  if (!(await isPlatformAdmin(auth.user.id))) notFound();

  await recordAuditEvent({ action: "platform_admin.view", actorUserId: auth.user.id, actorType: "admin", targetType: "admin_dashboard" });
  const stats = await loadStats();

  return (
    <main className="min-h-screen bg-[#302821] px-5 py-12 text-[#fff9f2] sm:px-8 sm:py-16">
      <section className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfb89f]">Eventloom admin</p>
        <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-5xl font-medium leading-[0.92] tracking-[-0.055em]">Overview</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {Object.entries(stats).map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-white/15 bg-white/[0.07] p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-white/50">{label}</p>
              <p className="mt-4 text-4xl font-semibold">{value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
