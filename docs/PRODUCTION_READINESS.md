# Eventloom production-readiness register

Target: OWASP ASVS 5.0 Level 2. This register is a release gate, not a claim of absolute security or zero defects.

## Implemented and verified

- Public signup, checkout, RSVP, and domain purchase flags fail closed in production.
- Platform administration requires verified email, AAL2 MFA, database-backed staff authorization, no-store rendering, and audit events.
- RSVP uses signed form tokens, Turnstile, keyed IP hashes, idempotency, an atomic service-only database function, active entitlement/form checks, and generic errors.
- Legacy RSVP PII and rate-limit data are quarantined in a non-exposed schema. Direct anonymous RSVP writes are revoked.
- Draft image uploads are private, validated by decoded content, re-encoded, stripped of metadata, and served through an authorization-aware endpoint.
- Stripe events are signature verified, durably recorded, idempotently fulfilled, postcondition checked, retried by Stripe on failure, and represented by fulfillment jobs/attempts.
- OpenSRS registration uses customer registrant data in an encrypted 24-hour payload, separate at-cost Checkout pricing, registrar lock, WHOIS privacy, manual renewal, and Vercel DNS attachment.
- Legal pages are versioned and globally linked. Checkout accepts only database versions marked active.
- Daily maintenance purges RSVP data after the event retention deadline, removes expired registrant payloads, and reports stuck fulfillment or overdue privacy work.
- Account and RSVP exports/deletions require verified email and MFA. Active domains block account deletion; retained financial/legal records are detached and pseudonymized.
- CI runs typecheck, lint, unit/integration tests, production build, dependency audit, SBOM generation, secret scanning, and CodeQL. Dependabot is enabled.
- Per-request nonce CSP is report-only by default and can be enforced with `CSP_ENFORCE_ENABLED=true`. Script policy contains no `unsafe-inline`.

## Launch blockers owned outside the repository

| Gate | Required evidence | Owner | Deadline/status |
|---|---|---|---|
| Supabase Auth | Enable leaked-password protection and at least one additional supported MFA option; validate recovery and session revocation | Founder | Before invited paid beta |
| Legal | Ontario/US counsel approves every legal document, business identity, consumer contract flow, privacy roles, accessibility language, and breach notice | Canadian counsel | `LEGAL_REVIEW_APPROVED` stays false until signed approval |
| Tax/accounting | GST/HST and US sales-tax determination plus Stripe Tax decision | Accountant | `ACCOUNTING_REVIEW_APPROVED` stays false |
| Independent security | ASVS L2 penetration test and retest with zero critical/high and no P0/P1 | Independent tester | `PENETRATION_TEST_APPROVED` stays false |
| Provider contracts | DPAs/terms/locations reviewed for Vercel, Supabase, Stripe, OpenAI, OpenSRS, Sentry, and email | Founder + counsel | `PROVIDER_DPA_REVIEW_APPROVED` stays false |
| Monitoring | Create privacy-scrubbed Sentry project, alerts, uptime synthetics, and on-call routing | Founder | Readiness fails until Sentry variables are configured |
| Infrastructure | Upgrade Vercel/Supabase plans; configure WAF/Bot rules, PITR/backups, deployment protection, protected branch, and restore drill | Founder | Before paid beta |
| Business identity | Owned business email/domain and non-home business or virtual mailing address | Founder | Required environment variables fail closed |
| Operations | Breach tabletop, restore test, credential rotation, rollback, payment reconciliation, and domain-recovery exercises | Founder | `PRIVACY_TABLETOP_COMPLETED` stays false |

## Reviewed database-advisor items

- Security advisor: only the two provider-owned Auth warnings above remain. All anonymous table/RPC grants, exposed privileged functions, missing RLS, mutable search paths, and hard-coded email policies were remediated.
- Performance advisor: missing foreign-key indexes, repeated `auth.uid()` evaluation, missing primary keys, and overlapping permissive policies were remediated. “Unused index” notices are expected immediately after adding indexes and must be reassessed after 30 days of representative beta traffic; owner: founder, due before general availability. Do not delete an index solely because a fresh database reports no usage.
- Supabase Auth’s absolute connection allocation is a provider configuration item; switch it to percentage allocation during the required production-plan upgrade, owner: founder, due before invited paid beta.

The authenticated `/api/health/ready` endpoint is the machine-readable launch gate. Draft legal documents and any missing external approval make it return HTTP 503.
