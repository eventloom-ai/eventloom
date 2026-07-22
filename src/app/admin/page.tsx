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
    <main className="min-h-screen bg-[#191713] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d7bd8d]">Eventloom admin</p>
        <h1 className="mt-2 text-5xl font-semibold">Overview</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {Object.entries(stats).map(([label, value]) => (
            <article key={label} className="rounded-[8px] border border-white/10 bg-white/8 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-white/50">{label}</p>
              <p className="mt-4 text-4xl font-semibold">{value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
