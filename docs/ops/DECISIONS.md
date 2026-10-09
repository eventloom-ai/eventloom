# Decisions

## 2026-10-08 — Claude manages Eventloom day to day
Owner delegated engineering, ops, user monitoring and marketing to Claude agents. Marketing budget is $0 (organic only). Outward-facing actions (public posts, emails to users, pricing, payments, registrar) still need owner approval. Owner pre-approved applying Supabase migrations (see below).

## 2026-10-08 — Safe local testing uses demo mode
`.env.local` points at production services. Hands-on testing uses the `eventloom-demo` launch config (port 3001), which blanks Supabase/Stripe/registrar env so nothing real is touched.

## 2026-10-08 — Recurring Claude agents run the product
Desktop scheduled tasks (run on the owner's Mac while the Claude app is open, using its logged-in vercel/gh/supabase CLIs):
- **Daily 8:00** health check → METRICS.md / INCIDENTS.md, small safe hotfixes.
- **Weekdays 10:00** ship one backlog item (verify → fix → tests → `npm run verify` → push to main → confirm deploy).
- **Mondays 11:00** one organic-growth improvement + social drafts for owner approval.
- **Fridays 17:00** owner report in `docs/ops/reports/`.
Production Supabase migrations are allowed after a local replay (`scripts/verify-migrations.sh`) and a dry run.

## 2026-10-08 — Email
`hello@eventloom.co` (and a catch-all) forward via ImprovMX free plan; DNS MX/SPF records on Vercel DNS. Legal identity env vars set; checkout and public RSVPs enabled in production.
