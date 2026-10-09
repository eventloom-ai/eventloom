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

## 2026-10-09 — Durable rate limits on every write, cost and abuse route
Before live payments, nothing but payload size, Turnstile and the AI credit stopped a client from hammering the API. Vercel functions run on many instances, so in-memory counters limit nothing, and the budget is $0 (no Upstash), so the limiter lives in Postgres:
- **Store:** `private.rate_limit_hits` + `public.consume_rate_limit(bucket, subject, window_seconds, max)` (migration `20261009120000_durable_rate_limits`), service_role only. Sliding window: count hits newer than `now - window` and record a hit only when under `max`, under a transaction-scoped advisory lock on hash(bucket, subject), so concurrent requests for one key serialize and can never all slip under the limit (verified: 40 parallel calls with max 5 → exactly 5 allowed). Denied attempts are not recorded, so hammering does not extend the lockout. Windows ≤ 1 day; the daily cron calls `purge_rate_limit_hits()` (rows > 2 days).
- **Subjects** are HMAC-SHA256 (`IP_HASH_SECRET`; plain SHA-256 when unset) of `user:<id>` or `ip:<x-forwarded-for[0]>` — never raw addresses or ids. A `user` limit without a signed-in user (demo mode) counts the address instead, so nobody is unlimited.
- **App side:** `src/lib/security/rate-limit.ts` — `enforceRateLimit(req, RATE_LIMITS.<policy>, { userId })` returns 429 `{ error: "rate_limited", retryAfterSeconds }` with `Retry-After`, or `null`. All limits are in the `RATE_LIMITS` table there; the UI turns `rate_limited` into "You’re doing that too quickly — try again in N minutes" (`src/lib/rate-limit-message.ts`).
- **Failure mode:** fail **open** and log `rate_limiter_unavailable` if the RPC errors or takes > 2.5 s — except the AI routes, which fail **closed** (503 `rate_limit_unavailable`, Retry-After 60) because every call costs OpenAI money. Exception to the exception: PostgREST `PGRST202` (function missing = migration not applied yet) fails open everywhere, so shipping the code before the migration cannot take AI down. Demo mode (no Supabase) uses a per-process in-memory sliding log with the same semantics.
- Multiple limits on one route are checked in parallel; a hit is recorded in every window that allowed it even if another denied (slight over-count, never under-count).

| Route | Policy (`RATE_LIMITS.*`) | Limit | Counted by | Limiter down |
| --- | --- | --- | --- | --- |
| `POST /api/events/build`, `POST /api/events`, `POST /api/events/studio`, `POST /api/events/[id]/studio/messages` | `aiGeneration` (one budget shared by all four) | 10/hour **and** 40/day per user; 30/hour per IP | user + IP | **closed** (503) |
| `POST /api/events/[id]/assets` | `assetUpload` | 60/hour | user | open |
| `POST /api/events/[id]/publish`, `POST /api/stripe/checkout` | `checkout` (shared) | 10/hour | user | open |
| `GET /api/domains/search`, `POST /api/domains/check` | `domainLookup` (shared) | 30/10 min | IP | open |
| `POST /api/rsvp` | `rsvpSubmit` | 60/10 min (route) — plus the RPC's own 30/10 min per event+IP | IP | open |
| `POST /api/feedback` | `feedback` | 5/hour (plus the existing DB check: 5/hour per user, 3/hour anonymous) | IP | open |
| `POST /api/privacy/requests` | `privacyRequest` | 5/hour | IP | open |
| `GET /api/account` (data export), `GET /api/events/[id]/rsvps/export` | `export` (shared) | 30/hour | user | open |
| `PATCH /api/account` (profile) | `profileUpdate` | 30/hour | user | open |
| `DELETE /api/account` | `accountDelete` | 5/hour | user | open |
| `POST /api/legal/accept` | `legalAccept` | 20/hour | user | open |
| `POST /api/organizations` | `organizationCreate` | 20/hour | user | open |
| `DELETE /api/events/[id]` | `eventDelete` | 60/hour | user | open |
| `PUT /api/events/[id]/privacy` | `eventSettings` | 120/hour | user | open |
| `DELETE /api/events/[id]/rsvps/[submissionId]` | `rsvpDelete` | 300/hour (bulk spam cleanup) | user | open |
| `PATCH /api/events/[id]/studio` (autosave, design switch) | `studioAutosave` | 600/hour | user | open |
| `POST /api/events/[id]/studio/versions/[versionId]/restore` | `studioRestore` | 120/hour | user | open |
| `POST /api/events/[id]/studio/runs/[runId]/cancel` | `studioCancel` | 120/hour | user | open |
| `POST /api/csp-report` | `cspReport` | 120/min; over the limit the report is **dropped silently** (204) | IP | open |

Deliberately **not** limited: `POST /api/stripe/webhook` (Stripe signature), `GET /api/cron/maintenance` (`CRON_SECRET`), `POST /api/admin/fulfillment/replay` and `GET /api/agent/status` (platform admin + MFA), `/api/health/*` (readiness token / admin; `payments` is a 404 stub), read-only GETs (`/api/events/[id]/studio`, build-job polling `/api/events/build/[jobId]` and `/active`, the studio run SSE stream — a 429 would permanently stop the browser's EventSource — and `/api/assets/[id]`, which is CDN-cached once published), `/auth/callback` and `/auth/signout` (Supabase Auth's own limits), `/llms.txt`. There are no server actions. Sign-up / sign-in / password reset go straight from the browser to Supabase Auth, so app routes cannot limit them — see "Needs owner" in BACKLOG.md for the dashboard settings; the auth form sends a Turnstile `captchaToken` on all three when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set.

Tuning: change a number in `RATE_LIMITS` and redeploy (no migration). Watch logs for `rate_limited` (warn, with bucket and path) and `rate_limiter_unavailable` / `rate_limit_failed_closed` (error).
