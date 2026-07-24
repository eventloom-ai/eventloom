import { demoEvents } from "@/lib/sample-data";
import { getAuthContext, hasRequiredMfa } from "@/lib/security/auth";
import { recordAuditEvent } from "@/lib/security/audit";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { serviceSupabase } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReferralSummary = {
  clicks: number;
  newSignups: number;
  existingCreators: number;
  drafts: number;
  paidPublications: number;
};

type ReferralSource = ReferralSummary & {
  sourceEventId: string | null;
  sourceSlug: string;
  sourceTitle: string;
};

const emptyReferralSummary: ReferralSummary = {
  clicks: 0,
  newSignups: 0,
  existingCreators: 0,
  drafts: 0,
  paidPublications: 0,
};

async function loadStats() {
  const client = serviceSupabase();
  if (!client) {
    return {
      platform: { events: demoEvents.length, domains: 0, payments: 0, failedJobs: 0 },
      referral: emptyReferralSummary,
      referralSources: [] as ReferralSource[],
      referralAvailable: false,
    };
  }

  const [events, domains, payments, failedJobs, referralSummary, referralSources] = await Promise.all([
    client.from("events").select("id", { count: "exact", head: true }),
    client.from("domains").select("id", { count: "exact", head: true }),
    client.from("payments").select("id", { count: "exact", head: true }),
    client.from("generation_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    client.rpc("referral_funnel_summary"),
    client.rpc("referral_funnel_by_source"),
  ]);

  const summaryRow = Array.isArray(referralSummary.data) ? referralSummary.data[0] : referralSummary.data;
  const number = (value: unknown) => Number(value ?? 0);
  const sourceRows: ReferralSource[] = (Array.isArray(referralSources.data) ? referralSources.data : []).map((row: Record<string, unknown>) => ({
    sourceEventId: typeof row.source_event_id === "string" ? row.source_event_id : null,
    sourceSlug: String(row.source_slug ?? "Deleted event"),
    sourceTitle: String(row.source_title ?? "Deleted event"),
    clicks: number(row.clicks),
    newSignups: number(row.new_signups),
    existingCreators: number(row.existing_creators),
    drafts: number(row.drafts),
    paidPublications: number(row.paid_publications),
  }));
  return {
    platform: {
      events: events.count ?? 0,
      domains: domains.count ?? 0,
      payments: payments.count ?? 0,
      failedJobs: failedJobs.count ?? 0,
    },
    referral: summaryRow ? {
      clicks: number(summaryRow.clicks),
      newSignups: number(summaryRow.new_signups),
      existingCreators: number(summaryRow.existing_creators),
      drafts: number(summaryRow.drafts),
      paidPublications: number(summaryRow.paid_publications),
    } : emptyReferralSummary,
    referralSources: sourceRows,
    referralAvailable: !referralSummary.error && !referralSources.error,
  };
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : "—";
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
          {Object.entries(stats.platform).map(([label, value]) => (
            <article key={label} className="rounded-[8px] border border-white/10 bg-white/8 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-white/50">{label}</p>
              <p className="mt-4 text-4xl font-semibold">{value}</p>
            </article>
          ))}
        </div>

        <section className="mt-14" aria-labelledby="referral-funnel-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Guest-to-host growth</p>
              <h2 id="referral-funnel-heading" className="mt-2 text-3xl font-semibold">Referral funnel</h2>
            </div>
            {stats.referralAvailable ? (
              <p className="text-sm text-white/50">First-touch attribution · 30-day window</p>
            ) : null}
          </div>

          {!stats.referralAvailable ? (
            <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100">
              Referral reporting is unavailable until the referral database migration is applied.
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["CTA clicks", stats.referral.clicks, "Guest visits"],
                  ["New signups", stats.referral.newSignups, `${rate(stats.referral.newSignups, stats.referral.clicks)} of clicks`],
                  ["First drafts", stats.referral.drafts, `${rate(stats.referral.drafts, stats.referral.newSignups + stats.referral.existingCreators)} of creators`],
                  ["Paid events", stats.referral.paidPublications, `${rate(stats.referral.paidPublications, stats.referral.drafts)} of drafts`],
                ].map(([label, value, detail]) => (
                  <article key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.06] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{label}</p>
                    <p className="mt-3 text-4xl font-semibold">{value}</p>
                    <p className="mt-2 text-xs text-white/45">{detail}</p>
                  </article>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
                Existing creators attributed: <span className="font-semibold text-white">{stats.referral.existingCreators}</span>
              </div>

              <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-white/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Source event</th>
                      <th className="px-4 py-3 font-semibold">Clicks</th>
                      <th className="px-4 py-3 font-semibold">New signups</th>
                      <th className="px-4 py-3 font-semibold">Existing</th>
                      <th className="px-4 py-3 font-semibold">Drafts</th>
                      <th className="px-4 py-3 font-semibold">Paid</th>
                      <th className="px-4 py-3 font-semibold">Click → paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {stats.referralSources.length ? stats.referralSources.map((source) => (
                      <tr key={source.sourceEventId ?? source.sourceSlug}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-white">{source.sourceTitle}</p>
                          <p className="mt-1 text-xs text-white/40">/{source.sourceSlug}</p>
                        </td>
                        <td className="px-4 py-4">{source.clicks}</td>
                        <td className="px-4 py-4">{source.newSignups}</td>
                        <td className="px-4 py-4">{source.existingCreators}</td>
                        <td className="px-4 py-4">{source.drafts}</td>
                        <td className="px-4 py-4">{source.paidPublications}</td>
                        <td className="px-4 py-4">{rate(source.paidPublications, source.clicks)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-white/45">No referral activity yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
