import { demoEvents } from "@/lib/sample-data";
import { appUrl } from "@/lib/env";
import { REPORT_REASONS, reportReasonLabel } from "@/lib/safety/report-reasons";
import { countOpenReports, listOpenReports, listSuspendedEvents, type AbuseReportRow, type SuspendedEventRow } from "@/lib/safety/takedown";
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
    return { events: demoEvents.length, domains: 0, payments: 0, failedJobs: 0, openReports: 0 };
  }

  const [events, domains, payments, failedJobs, openReports] = await Promise.all([
    client.from("events").select("id", { count: "exact", head: true }),
    client.from("domains").select("id", { count: "exact", head: true }),
    client.from("payments").select("id", { count: "exact", head: true }),
    client.from("generation_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    countOpenReports(client),
  ]);

  return {
    events: events.count ?? 0,
    domains: domains.count ?? 0,
    payments: payments.count ?? 0,
    failedJobs: failedJobs.count ?? 0,
    // null when the abuse_reports migration is not applied yet.
    openReports: openReports ?? "—",
  };
}

async function loadModeration(): Promise<{ reports: AbuseReportRow[]; suspended: SuspendedEventRow[] }> {
  const client = serviceSupabase();
  if (!client) return { reports: [], suspended: [] };
  const [reports, suspended] = await Promise.all([listOpenReports(client), listSuspendedEvents(client)]);
  return { reports, suspended };
}

export default async function AdminPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/admin");
  if (!auth.emailVerified) redirect("/app/security?reason=email");
  if (!hasRequiredMfa(auth)) redirect("/app/security?next=/admin");
  if (!(await isPlatformAdmin(auth.user.id))) notFound();

  await recordAuditEvent({ action: "platform_admin.view", actorUserId: auth.user.id, actorType: "admin", targetType: "admin_dashboard" });
  const [stats, moderation] = await Promise.all([loadStats(), loadModeration()]);
  const base = appUrl().replace(/\/$/, "");

  return (
    <main className="min-h-screen bg-[#191713] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d7bd8d]">Eventloom admin</p>
        <h1 className="mt-2 text-5xl font-semibold">Overview</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-5">
          {Object.entries(stats).map(([label, value]) => (
            <article key={label} className="rounded-[8px] border border-white/10 bg-white/8 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-white/50">{label}</p>
              <p className="mt-4 text-4xl font-semibold">{value}</p>
            </article>
          ))}
        </div>
        <ModerationQueue base={base} reports={moderation.reports} suspended={moderation.suspended} />
      </section>
    </main>
  );
}

const buttonClass = "min-h-9 rounded-full border border-white/20 px-4 text-sm font-semibold hover:bg-white/10";

// Plain forms posting to /api/admin/reports (which re-checks admin + MFA); no client JavaScript needed.
function ModerationQueue({ base, reports, suspended }: { base: string; reports: AbuseReportRow[]; suspended: SuspendedEventRow[] }) {
  return (
    <section id="reports" className="mt-12">
      <h2 className="text-2xl font-semibold">Open abuse reports</h2>
      {reports.length === 0 ? <p className="mt-3 text-white/60">No open reports.</p> : null}
      <ul className="mt-4 grid gap-3">
        {reports.map((report) => (
          <li key={report.id} className="rounded-[8px] border border-white/10 bg-white/8 p-5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <a href={`${base}/${report.slug}`} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-[#d7bd8d] underline underline-offset-4">/{report.slug}</a>
              <span className="text-sm uppercase tracking-[0.14em] text-white/70">{reportReasonLabel(report.reason)}</span>
              <span className="text-sm text-white/50">{new Date(report.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC · {report.status}</span>
              {!report.event_id ? <span className="text-sm text-white/50">no matching event</span> : null}
            </div>
            {report.details ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/80">{report.details}</p> : null}
            {report.reporter_email ? <p className="mt-1 text-sm text-white/60">Reporter: {report.reporter_email}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {report.event_id ? (
                <form method="post" action="/api/admin/reports" className="flex flex-wrap gap-2">
                  <input type="hidden" name="action" value="suspend" />
                  <input type="hidden" name="eventId" value={report.event_id} />
                  <input type="hidden" name="reportId" value={report.id} />
                  <select name="reason" defaultValue={report.reason} aria-label="Suspension reason" className="min-h-9 rounded-full bg-white/10 px-3 text-sm">
                    {REPORT_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                  </select>
                  <button className={`${buttonClass} border-red-300/40 text-red-200`}>Suspend event</button>
                </form>
              ) : null}
              {report.status === "new" ? (
                <form method="post" action="/api/admin/reports">
                  <input type="hidden" name="action" value="reviewing" />
                  <input type="hidden" name="reportId" value={report.id} />
                  <button className={buttonClass}>Mark reviewing</button>
                </form>
              ) : null}
              <form method="post" action="/api/admin/reports">
                <input type="hidden" name="action" value="dismiss" />
                <input type="hidden" name="reportId" value={report.id} />
                <button className={buttonClass}>Dismiss</button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-2xl font-semibold">Suspended events</h2>
      <form method="post" action="/api/admin/reports" className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="action" value="suspend" />
        <label className="flex items-center gap-2 text-sm">
          Suspend a page by address: /
          <input name="slug" required maxLength={63} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" aria-label="Event address" className="min-h-9 rounded-full bg-white/10 px-3 text-sm" />
        </label>
        <select name="reason" defaultValue="phishing" aria-label="Suspension reason" className="min-h-9 rounded-full bg-white/10 px-3 text-sm">
          {REPORT_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
        </select>
        <button className={`${buttonClass} border-red-300/40 text-red-200`}>Suspend</button>
      </form>
      {suspended.length === 0 ? <p className="mt-3 text-white/60">No suspended events.</p> : null}
      <ul className="mt-4 grid gap-3">
        {suspended.map((event) => (
          <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-white/10 bg-white/8 p-5">
            <div>
              <p className="font-semibold">/{event.slug}</p>
              <p className="text-sm text-white/60">{event.suspension_reason ? reportReasonLabel(event.suspension_reason) : "No reason"} · since {new Date(event.suspended_at).toISOString().slice(0, 10)}</p>
            </div>
            <form method="post" action="/api/admin/reports">
              <input type="hidden" name="action" value="unsuspend" />
              <input type="hidden" name="eventId" value={event.id} />
              <button className={buttonClass}>Lift suspension</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
