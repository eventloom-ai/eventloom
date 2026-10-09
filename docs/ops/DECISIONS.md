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

## 2026-10-09 — AI reasoning effort is set per call (P6)
Every OpenAI call was `high` by default and the studio "original site" call was hard-coded to `xhigh`, while a build is billed as one flat 50¢ credit. Reasoning tokens dominate both cost and latency, and the outputs are schema-constrained, so effort now depends on the job (`openaiResponsesOptions(purpose)` in `src/lib/env.ts`):
- `planner` (brief → event facts + palette): **low** — extraction into a fixed schema.
- `art-director` (pick style/palette from a closed set + a few lines of copy): **low** — was already hard-coded low.
- `original-site` (compose a whole page document: studio create, "start over"): **medium** — was `xhigh`; the most creative call, but `xhigh` regularly ran close to the 240s call budget.
- `studio-edit` (apply one change to an existing page or design): **medium** — must respect node ids and "smallest safe change" rules.
Overrides stay available without a deploy: `OPENAI_REASONING_EFFORT_<PURPOSE>` (e.g. `OPENAI_REASONING_EFFORT_STUDIO_EDIT=high`) wins for one call type; `OPENAI_REASONING_EFFORT` / `AI_REASONING_EFFORT` forces every call. **Owner check:** if `OPENAI_REASONING_EFFORT` is set in Vercel production (it was `high` in `.env.example`), remove it or the new defaults never apply. The admin `/api/agent/status` response shows the effective effort per call type. Revisit if quality drops; token-based credit pricing is still open.
