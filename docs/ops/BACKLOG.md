# Backlog

Source: full audit on 2026-10-08 (hands-on browser testing in demo mode + three code audits against `a3274f6`).
Status: `open` · `in progress` · `fixed (<commit>)` · `needs owner`.

## P0 — security, money, data loss

| # | Issue | Where | Status |
| --- | --- | --- | --- |
| S1 | Any signed-in user can write the `domains` table directly (Supabase REST) and hijack a tenant subdomain or squat a custom domain; host resolution trusts any row regardless of status | `20260722053921_consolidate_rls_policies.sql`, grants `:25`, `tenancy.ts resolveEventByHost` | open |
| S2 | Guest PII readable with a stolen password (no MFA): RLS on `rsvp_submissions/guests/answers` ignores AAL; app reads via service role anyway | grants `:34-42` | open |
| S3 | Unmetered DALL·E endpoint any signed-in user can loop (~$0.08/call); nothing in the UI calls it | `api/invitation/generate` | open |
| S4 | Cancel-after-generate refunds AI credit after the OpenAI call is paid; patch is streamed before cancel check → free unlimited AI | `studio-agent.ts:185-206` | open |
| S5 | Multiple pending checkouts per event → second payment never fulfilled, never refunded; domain registered before the conflict check | `payments/stripe.ts:41-48`, `stripe/webhook/route.ts:112-128` | open |
| S6 | Domain provisioning retries are not idempotent; price cap re-checked after payment → paid orders stuck forever | `domains/provision.ts:18-26` | open |
| S7 | Async (ACH etc.) Checkout payments never fulfilled | `stripe/webhook/route.ts:60-75` | open |
| S8 | Nothing asserts Stripe live mode in production (key prefix / `event.livemode`) | `env.ts:134`, webhook | open |
| S9 | Asset bucket/path trusted from user-writable `assets.metadata` (service-role read/delete) | `api/assets/[assetId]`, event/account delete | open |
| S10 | Users can self-set legal onboarding flags on `profiles` | `20260722053811…sql:20` | open |
| S11 | No reserved-slug list: `login`, `admin`, `api`, SEO pages (`rsvp-website`…) claimable; subdomain phishing | `validation.ts:4` | open |

## P1 — broken core flows

| # | Issue | Where | Status |
| --- | --- | --- | --- |
| B1 | Clicking "Next question" on Q4 auto-submits the build (button type swaps in place) — charges $0.50 before user finishes | `site-build-studio.tsx:222-226` | open |
| B2 | Build spends ~2 min generating an HTML artifact that is never rendered (pages render the site document) — slow + wasted OpenAI cost; progress stalls at 45% | `agent/harness.ts:113` | open |
| B3 | Landing-page date/time/location not prefilled into intake; appended as raw ISO without sentence break; ISO regex `\b` fails before `T`; brief truncated after details appended | `site-build-studio.tsx`, `generate-config.ts:177`, `entry.ts` | open |
| B4 | Page header shows 7:30 PM while schedule says "Time to be announced" | grounding / compose | open |
| B5 | AI style edit wipes all other style keys (nulls treated as deletes) | `studio-agent.ts:103-105` | open |
| B6 | Building with reference photos from `/app/events/new` crashes studio permanently (data: URL fails `safeUrl`) | `parse-build-form.ts:84`, `studio-store.ts:85` | open |
| B7 | Stuck AI run/job permanently blocks builds and the studio assistant for that event; no AI fetch timeouts; no reaper | `studio-store.ts:139`, generators | open |
| B8 | Meal-preference and other custom RSVP answers silently dropped | `submit_public_rsvp`, field seeding | open |
| B9 | RSVP deadline field does nothing | `config.rsvpDeadline` vs `events.rsvp_deadline_at` | open |
| B10 | Puck autosave runs during an AI run → version conflicts, lost edits | `visual-studio.tsx:87-118` | open |
| B11 | Puck studio lost image upload and RSVP-question toggles | `eventloom-puck-config.tsx` | open |
| B12 | Run-event sequence race → UI stuck on "Stopping…" | `studio-store.ts:236` | open |
| B13 | Hyphen can't be typed in slug field; non-Latin brief disables Create | `new-event-starter.tsx`, `site-build-studio.tsx:242` | open |
| B14 | Any title with "and"/"&" rendered as a couple layout ("Rock / & / Roll Night") | `site-document.ts:224`, renderer `:87` | open |
| B15 | RSVP form throws after success (`currentTarget` after await); server error codes never shown | `rsvp-form.tsx:59` | open |
| B16 | GIF advertised but rejected | `studio-chat.tsx:45` vs `event-assets.ts:5` | open |
| B17 | Puck preview ≠ published page (fonts, dividers, quotes, grids) | `eventloom-puck-config.tsx` | open |
| B18 | Demo mode: studio ignores locally built events; second autosave 409s | `studio-store.ts:114` | open |

## P2 — scale & cost

| # | Issue | Where | Status |
| --- | --- | --- | --- |
| P1 | Uploaded photos stored full-size (1.5–3 MB), served through a function with no CDN cache → egress bill on first viral event | `event-assets.ts:16`, `api/assets/[assetId]` | open |
| P2 | No public page is CDN-cached (per-request CSP nonce + `no-store`); event pages do 3–5 sequential DB queries | `proxy.ts:21-30`, `tenancy.ts` | open |
| P3 | `BuildJobProvider` fetches `/api/events/build/active` on every page incl. guest pages | `build-job-provider.tsx` | open |
| P4 | Every RSVP seq-scans the rate-limit table, locks the event row; 10/IP/10min blocks shared Wi-Fi | `20260731140918…sql:114-126` | open |
| P5 | 13 font families global on every page | `layout.tsx:24-38` | open |
| P6 | AI reasoning effort high/xhigh by default; flat 50¢ credit regardless of tokens | `env.ts:115`, `generate-document.ts:319` | open |

## P3 — growth / UX

| # | Issue | Status |
| --- | --- | --- |
| G1 | Event pages have no metadata: inherit homepage title + canonical `/` (share previews generic; Google sees duplicates). Should be noindex by default with self-canonical + per-event OG image | open |
| G2 | No "Made with Eventloom" loop on guest pages; legal footer links break on custom domains; unmerged branch `codex/guest-to-host-viral-loop` | open |
| G3 | SEO landing pages not linked from homepage; no FAQ/SoftwareApplication schema | open |
| G4 | No template gallery / occasion pages (biggest organic lever) | open |
| G5 | Mobile: Feedback button overlaps content; hero placeholder splits into two columns; studio overflows viewport by ~94px | open |

## Needs owner

- Confirm Stripe is in live mode and payouts go to the right bank (Dashboard → Settings → Payouts). Check `PUBLIC_CHECKOUT_ENABLED` is `true` in Vercel production env — it defaults to off.
- `vercel login` on this machine so agents can read deployments/logs/env names.
- Approve applying new Supabase migrations to production.
