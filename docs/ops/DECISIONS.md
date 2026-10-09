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

## 2026-10-09 — User-safety protections before launch
Anyone can publish a page on our domain with a form that collects guests' names, emails and phones, so the page is a phishing and abuse surface. Added, all at $0:
- **Moderation** (`src/lib/safety/moderation.ts`): OpenAI `omni-moderation-latest` (free) on build briefs + reference photos, studio create, studio chat messages, every uploaded photo (after resize, before storage) and the final guest-facing text at publish. Blocks only `sexual/minors` (any flag or score ≥ 0.3), `sexual` ≥ 0.9, `hate/threatening` ≥ 0.8, `harassment/threatening` ≥ 0.85, `violence/graphic` ≥ 0.85, `self-harm/instructions` ≥ 0.8, `illicit` ≥ 0.9, `illicit/violent` ≥ 0.8. Plain `hate`, `harassment`, `violence` never block on their own (party copy is full of "killer" and "roast"). Refused before any job/run/credit exists → `content_not_allowed`, no AI credit. **Fails open** on provider error/timeout/no key (3 s text, 5 s image), logged as `moderation_unavailable`. Content is never logged.
- **Phishing rules at publish** (`src/lib/safety/phishing.ts`): requests for passwords/codes, card numbers/CVV, bank logins/account numbers, SSN/SIN, wallet seed phrases or "connect your wallet"; brand/bank/government names next to account-security or refund lures; brand-titled support/login pages and slugs; sign-in-looking, shortened, IP, punycode or brand-impostor links → publish held with `content_needs_review`. Conservative by design (hotel-block card instructions, PayPal/Venmo gift funds, Wi-Fi passwords, passport numbers for destination weddings, "verify your identity at the front desk" all pass; see `safety-phishing.test.ts`). Runs before both direct publish and checkout.
- **Links**: guest-page links are `#…`, same-site `/…` (never `//host`) or https only; outbound ones get `target=_blank rel="noopener noreferrer nofollow"`. Pages are React-rendered from closed schemas: no raw HTML, forms, scripts or iframes from creators.
- **Report this page** (`/report`, `/api/reports`, `public.abuse_reports`): footer link on every guest page, Turnstile always required, 5 reports/hour and 2/page/day per keyed IP hash, raw IP never stored, email only if the reporter gives one.
- **Takedown**: `events.suspended_at` / `suspension_reason` (not a new status — status drives RSVP, fulfillment and dashboards, and lifting a suspension must restore the event exactly). Suspended events 410 on every host from the proxy (30 s per-instance cache, fails open) and 404 from the page itself, no metadata or share card, RSVPs refused in the app and in `submit_public_rsvp`, publish/checkout refused. Only the service role can change the columns (trigger). Admin Suspend / Lift / Dismiss / Reviewing on `/admin` (MFA), audit-logged.

