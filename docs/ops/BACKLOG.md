# Backlog

Source: full audit on 2026-10-08 (hands-on browser testing in demo mode + three code audits against `a3274f6`).
Status: `open` · `in progress` · `fixed (<commit>)` · `needs owner`.

## P0 — security, money, data loss

| # | Issue | Where | Status |
| --- | --- | --- | --- |
| S1 | Any signed-in user can write the `domains` table directly (Supabase REST) and hijack a tenant subdomain or squat a custom domain; host resolution trusts any row regardless of status | `20260722053921_consolidate_rls_policies.sql`, grants `:25`, `tenancy.ts resolveEventByHost` | fixed (code) · migration pending |
| S2 | Guest PII readable with a stolen password (no MFA): RLS on `rsvp_submissions/guests/answers` ignores AAL; app reads via service role anyway | grants `:34-42` | fixed · migration pending |
| S3 | Unmetered DALL·E endpoint any signed-in user can loop (~$0.08/call); nothing in the UI calls it | `api/invitation/generate` | fixed |
| S4 | Cancel-after-generate refunds AI credit after the OpenAI call is paid; patch is streamed before cancel check → free unlimited AI | `studio-agent.ts:185-206` | fixed |
| S5 | Multiple pending checkouts per event → second payment never fulfilled, never refunded; domain registered before the conflict check | `payments/stripe.ts:41-48`, `stripe/webhook/route.ts:112-128` | fixed |
| S6 | Domain provisioning retries are not idempotent; price cap re-checked after payment → paid orders stuck forever | `domains/provision.ts:18-26` | fixed (retries resume from the recorded registration; cap not re-applied after payment) |
| S7 | Async (ACH etc.) Checkout payments never fulfilled | `stripe/webhook/route.ts:60-75` | fixed (subscribe webhook to async_payment_succeeded) |
| S8 | Nothing asserts Stripe live mode in production (key prefix / `event.livemode`) | `env.ts:134`, webhook | fixed |
| S9 | Asset bucket/path trusted from user-writable `assets.metadata` (service-role read/delete) | `api/assets/[assetId]`, event/account delete | fixed · migration pending |
| S10 | Users can self-set legal onboarding flags on `profiles` | `20260722053811…sql:20` | fixed · migration pending |
| S11 | No reserved-slug list: `login`, `admin`, `api`, SEO pages (`rsvp-website`…) claimable; subdomain phishing | `validation.ts:4` | fixed (app) · DB constraint open |

## P1 — broken core flows

| # | Issue | Where | Status |
| --- | --- | --- | --- |
| B1 | Clicking "Next question" on Q4 auto-submits the build (button type swaps in place) — charges $0.50 before user finishes | `site-build-studio.tsx:222-226` | fixed |
| B2 | Build spends ~2 min generating an HTML artifact that is never rendered (pages render the site document) — slow + wasted OpenAI cost; progress stalls at 45% | `agent/harness.ts:113` | fixed (builds ~11s, were ~2.5 min) |
| B3 | Landing-page date/time/location not prefilled into intake; appended as raw ISO without sentence break; ISO regex `\b` fails before `T`; brief truncated after details appended | `site-build-studio.tsx`, `generate-config.ts:177`, `entry.ts` | fixed |
| B4 | Page header shows 7:30 PM while schedule says "Time to be announced" | grounding / compose | fixed |
| B5 | AI style edit wipes all other style keys (nulls treated as deletes) | `studio-agent.ts:103-105` | fixed |
| B6 | Building with reference photos from `/app/events/new` crashes studio permanently (data: URL fails `safeUrl`) | `parse-build-form.ts:84`, `studio-store.ts:85` | fixed |
| B7 | Stuck AI run/job permanently blocks builds and the studio assistant for that event; no AI fetch timeouts; no reaper | `studio-store.ts:139`, generators | fixed |
| B8 | Meal-preference and other custom RSVP answers silently dropped | `submit_public_rsvp`, field seeding | fixed · migration pending |
| B9 | RSVP deadline field does nothing | `config.rsvpDeadline` vs `events.rsvp_deadline_at` | open |
| B10 | Puck autosave runs during an AI run → version conflicts, lost edits | `visual-studio.tsx:87-118` | fixed |
| B11 | Puck studio lost image upload and RSVP-question toggles | `eventloom-puck-config.tsx` | open |
| B12 | Run-event sequence race → UI stuck on "Stopping…" | `studio-store.ts:236` | fixed |
| B13 | Hyphen can't be typed in slug field; non-Latin brief disables Create | `new-event-starter.tsx`, `site-build-studio.tsx:242` | fixed |
| B14 | Any title with "and"/"&" rendered as a couple layout ("Rock / & / Roll Night") | `site-document.ts:224`, renderer `:87` | fixed |
| B15 | RSVP form throws after success (`currentTarget` after await); server error codes never shown | `rsvp-form.tsx:59` | fixed |
| B16 | GIF advertised but rejected | `studio-chat.tsx:45` vs `event-assets.ts:5` | fixed |
| B17 | Puck preview ≠ published page (fonts, dividers, quotes, grids) | `eventloom-puck-config.tsx` | open |
| B18 | Demo mode: studio ignores locally built events; second autosave 409s | `studio-store.ts:114` | fixed |

## P2 — scale & cost

| # | Issue | Where | Status |
| --- | --- | --- | --- |
| P1 | Uploaded photos stored full-size (1.5–3 MB), served through a function with no CDN cache → egress bill on first viral event | `event-assets.ts:16`, `api/assets/[assetId]` | fixed: CDN cache header; uploads resized to 2400px, WebP q80, metadata stripped |
| P2 | No public page is CDN-cached (per-request CSP nonce + `no-store`); event pages do 3–5 sequential DB queries | `proxy.ts:21-30`, `tenancy.ts` | open |
| P3 | `BuildJobProvider` fetches `/api/events/build/active` on every page incl. guest pages | `build-job-provider.tsx` | fixed |
| P4 | Every RSVP seq-scans the rate-limit table, locks the event row; 10/IP/10min blocks shared Wi-Fi | `20260731140918…sql:114-126` | fixed · migration pending |
| P5 | 13 font families global on every page | `layout.tsx:24-38` | fixed: only Outfit, Inter and Playfair preload |
| P6 | AI reasoning effort high/xhigh by default; flat 50¢ credit regardless of tokens | `env.ts:115`, `generate-document.ts:319` | open |

## P3 — growth / UX

| # | Issue | Status |
| --- | --- | --- |
| G1 | Event pages have no metadata: inherit homepage title + canonical `/` (share previews generic; Google sees duplicates). Should be noindex by default with self-canonical + per-event OG image | fixed |
| G2 | No "Made with Eventloom" loop on guest pages; legal footer links break on custom domains; unmerged branch `codex/guest-to-host-viral-loop` | partial: made-with link added; referral branch not merged |
| G3 | SEO landing pages not linked from homepage; no FAQ/SoftwareApplication schema | fixed (3daf0d9) |
| G4 | No template gallery / occasion pages (biggest organic lever) | fixed: /templates + 14 occasion pages (3daf0d9) |
| G5 | Mobile: Feedback button overlaps content; hero placeholder splits into two columns; studio overflows viewport by ~94px | partial: chrome hidden on guest pages, studio overflow fixed |

## Found during fixes (open)

| # | Issue |
| --- | --- |
| N1 | **Production cannot take payments or RSVPs**: `PUBLIC_CHECKOUT_ENABLED`, `PUBLIC_RSVP_ENABLED`, `LEGAL_BUSINESS_NAME`, `LEGAL_CONTACT_EMAIL`, `LEGAL_MAILING_ADDRESS` are unset in Vercel production (all default off) |
| N2 | Build credit never refunded when the build harness fails; credit reserved before job creation — **fixed** |
| N3 | `/api/events/studio` reserves credit with no refund path on failure — **fixed** |
| N4 | Build can exceed 300s: two sequential AI calls each allowed 240s — **fixed** |
| N5 | `/api/events/[eventId]/generate` and `/api/builder/chat` still run the slow unused HTML artifact generation — **fixed** |
| N6 | `/api/organizations` slug validation ignores the reserved list — **fixed** |
| N7 | Prompt length unchecked server-side (URL brief up to 8000 + intake answers) — **fixed** |
| N8 | Monogram turns "Rock and Roll Night" into "R & R" — **fixed** |
| N9 | Demo-mode image uploads fail to save (data: URL rejected by schema) |
| N10 | Draft pages say "This event is no longer accepting responses" — should say RSVPs open after publishing — **fixed** |
| N11 | Hero subtitle wraps off-centre on composed pages |
| N12 | Supabase migrations are not replayable on a fresh DB (`20260722052902` references a function created later) |
| N13 | Preview deploys failing since 2026-09-23: Dependabot PRs #19 (prod deps, Stripe SDK expects apiVersion `2026-08-26.dahlia`) and #18 (dev deps) are stale and conflict with main — rebase (`@dependabot recreate`), fix the Stripe apiVersion, verify, merge |
| N14 | No error monitoring in production (Sentry env unset) |
| N15 | Essentially no traffic: ~48 requests in 7 days (2026-10-08), almost all internal testing |
| N16 | (fixed: public pages now CDN-cached with nonce-free CSP) Every response gets `Cache-Control: private, no-store` from `src/proxy.ts`, so prerendered marketing/template pages are never CDN-cached; prerendered HTML has no CSP nonces, so `CSP_ENFORCE_ENABLED=true` would break static pages. Needs a per-route policy (public static pages: cacheable + hash/self CSP) |
| N17 | Two-column sections with a large gap only show two columns at ≥ ~1150px (column min-width formula ignores the gap) — affects live event pages |
| N18 | "Use this template" sends logged-out visitors to /login rather than signup; palette chip not pre-selected from the template brief |
| N19 | Stuck domain order cases remain: register succeeded but recording failed + later step failed, or registrar reports pending — needs a registrar ownership check |
| N20 | Credit refund rules inconsistent (studio edit keeps credit on fallback; studio create refunds on fallback; main build keeps credit on template fallback); failed builds leave an empty placeholder draft |

## Needs owner

- Confirm Stripe is in live mode and payouts go to the right bank (Dashboard → Settings → Payouts). Check `PUBLIC_CHECKOUT_ENABLED` is `true` in Vercel production env — it defaults to off.
- `vercel login` on this machine so agents can read deployments/logs/env names.
- Approve applying new Supabase migrations to production.
