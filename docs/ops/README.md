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
