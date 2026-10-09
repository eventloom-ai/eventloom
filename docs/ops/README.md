# Eventloom operations log

Shared memory for everyone (human or agent) running Eventloom. Read this folder before starting work; update it when you finish.

| File | Purpose |
| --- | --- |
| `BACKLOG.md` | Ranked list of known bugs and improvements, with status |
| `DECISIONS.md` | Product/engineering decisions and why they were made |
| `INCIDENTS.md` | Production incidents, root cause, follow-ups |
| `GROWTH.md` | Marketing/SEO plan, what was tried, results ($0 budget) |
| `METRICS.md` | Dated snapshots of users, events, publishes, revenue, errors |

Rules for agents:
- Verify a backlog item still reproduces on the latest `origin/main` before fixing it.
- Every fix ships with a test when the code path is testable.
- Database migrations are written in `supabase/migrations/` but **applied to production only with the owner's approval**.
- Never post publicly, email users, change pricing, spend money, or touch Stripe/registrar settings without the owner's approval.

## Daily health check: open abuse reports

There is no outbound email service (hello@ only forwards), so new "Report this page" submissions are not pushed to
anyone. The daily health check must look at them, and `/admin` shows the open count with Suspend / Dismiss actions.

```sql
-- Open reports, oldest first (run with the service role / SQL editor; the table has no browser access).
select r.created_at, r.reason, r.slug, r.status, e.status as event_status, e.suspended_at,
       left(r.details, 200) as details, (r.reporter_email is not null) as can_follow_up
from public.abuse_reports r
left join public.events e on e.id = r.event_id
where r.status in ('new', 'reviewing')
order by r.created_at;

-- Pages with several open reports (likely real), and currently suspended events.
select slug, count(*) as open_reports, array_agg(distinct reason) as reasons
from public.abuse_reports where status in ('new', 'reviewing') group by slug having count(*) > 1 order by 2 desc;
select slug, suspended_at, suspension_reason from public.events where suspended_at is not null order by suspended_at desc;
```

Triage rule of thumb: any `phishing` report on a published page with a payment/login ask, or several reports for one
page, is acted on the same day (suspend on `/admin`, which closes its open reports and is audit-logged as
`event.suspended`). Note the count in `METRICS.md`. Logs to watch (Vercel): `abuse_report_received`,
`content_blocked` (moderation refused a brief/message/photo/page; category + event id only), `publish_held_for_review`
(phishing rules held a publish), and `moderation_unavailable` (provider miss — the request went through unchecked).

