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

## 2026-10-09 — One AI credit rule for builds, studio create and studio edits (N20)
A credit (50¢) is consumed only when the user gets a successful AI result. Implemented once in `src/lib/payments/ai-credit-rule.ts` (`aiCreditConsumed` / `settleBuildCredit`) and used by the build harness, `/api/events/studio` and `executeStudioRun`:
- **Succeeded with AI output** (at least one provider call returned output the saved result uses — e.g. the planner *or* the art director for a build, the original-site document *or* the art director for studio create, the edit itself for studio edits): credit kept.
- **Succeeded on deterministic fallback only** (no key, provider error, timeout, unparseable output): refunded. Previously the build and studio edits kept it.
- **Failed before the user saw AI output**: refunded. Previously a studio edit kept the credit for any failure after the provider was called.
- **Failed after the AI output reached the user** (studio patches stream to the editor before they are saved): kept, so a forced save failure can't launder free AI.
- **Cancelled after the provider call**: kept (S4); cancelled before it: refunded.
- **No credit reserved** (limit reached): no provider call at all — studio create used to still call the art director for free.
A failed *first* build also deletes its placeholder draft (`discardPlaceholderEvent`, only the owner's own `draft`, stored photos removed, the job detached so the client still sees the error); its refund is recorded with a null event id because `ai_credit_ledger.event_id` has no `on delete` action and would block the delete.

## 2026-10-09 — Legal version 2026-10-09 and a usage-based refund policy
Stripe needs a visible refund policy before live payments. The 2026-07-22 policy (retired by `20260723045103_remove_refund_policy`, commit 14d52be, no reason recorded) promised an unconditional 14-day refund and domain-fee carve-outs; a host could publish, collect every RSVP for an event inside 14 days, and still get the $20 back. The new policy (`/legal/refunds`, rule in `src/lib/payments/refund-policy.ts`): full refund within 14 days if fewer than 5 RSVP submissions and the event hasn't ended; service-failure refunds (not fixed in 72 h) until the event ends; no refunds after the event or after suspension for a violation; full refunds only, because `record_stripe_refund` only revokes the entitlement and archives the event on a full refund. Refunds stay manual in the Stripe Dashboard. Checkout now requires accepting `terms`, `privacy` and `refunds`; all versions come from `src/lib/legal-version.ts`. Hashes are of the real text and test-checked. Open items for the owner/lawyer: `docs/legal/OWNER-REVIEW.md`.
