# Legal version 2026-10-09: decisions for the owner and a lawyer

The policies in `src/lib/legal-documents.ts` are plain-language drafts that match how the product worked on 2026-10-09.
**No lawyer has reviewed them.** Before relying on them for live payments, have an Ontario lawyer confirm the items
below (ideally one who also covers US/EU consumer and privacy questions). Changing any text means bumping
`LEGAL_VERSION` and writing a new migration (the test prints the rows).

## Decisions to confirm

| # | Decision | Current draft | Why it needs review |
|---|---|---|---|
| 1 | Refund window and usage test | Full refund within 14 days of payment if fewer than 5 RSVP submissions and the event hasn't ended; service-failure refund (not fixed within 72 h) until the event ends; no refunds after the event ends or after suspension for a violation | EU/UK consumers have a 14-day right of withdrawal for digital services. Checkout does **not** collect the express "start now and lose the withdrawal right" consent, so the RSVP condition may not hold against EU consumers. Ontario's Consumer Protection Act also has internet-agreement disclosure rules (and a 2023 Act may come into force). Constants: `src/lib/payments/refund-policy.ts`. |
| 2 | Liability cap | Greater of the amount paid in the prior 12 months or US$100; carve-outs for fraud, wilful misconduct, gross negligence, death/personal injury | Enforceability against consumers varies by province/country. |
| 3 | Governing law | Ontario and federal Canadian law, Ontario courts; consumers keep local mandatory rights; **no** arbitration clause or class-action waiver | Ontario's CPA voids arbitration/class waivers for Ontario consumers; confirm forum wording. |
| 4 | Age limit | Hosts must be 18+ (checked at signup and acceptance); guests have no age gate | Confirm no stricter rule is needed for EU (GDPR Art. 8) since guests don't create accounts. |
| 5 | Legal entity | Policies name "Eventloom", 335 Webb Dr, Mississauga, ON L5B 4A1 | If Eventloom is a sole proprietorship, Ontario's Business Names Act requires registering the name; consider naming the legal person/corporation. The address appears on every policy page; `docs/PRODUCTION_READINESS.md` recommends a non-home or virtual mailing address. |
| 6 | Tax | Prices shown in USD, "we will show tax if we are required to charge it". Stripe Tax is **not** enabled | You must register for GST/HST once taxable revenue exceeds CAD $30,000 in four consecutive quarters (small-supplier threshold), then charge GST/HST on Canadian sales (13% HST in Ontario). Non-resident digital-services rules also apply in some US states, the EU and UK once thresholds are crossed. Track revenue by country from Stripe; decide on Stripe Tax before crossing any threshold. |
| 7 | Quebec | English only | Quebec's Charter of the French Language (Bill 96) requires French versions of standard-form consumer contracts for Quebec customers. Decide whether to translate or restrict. |
| 8 | Copyright / DMCA | Canadian notice-and-notice plus a DMCA-style notice/counter-notice process | US DMCA safe harbour requires registering a designated agent with the US Copyright Office (about US$6, renewed every 3 years). Canadian notice-and-notice requires forwarding notices and keeping records for 6 months (1 year if proceedings start). |
| 9 | Safe harbour for security research | Promise not to pursue good-faith researchers who follow the rules | Wording should be reviewed. |
| 10 | Privacy officer | `hello@eventloom.co` | PIPEDA requires a designated individual accountable for privacy; consider naming the role. |
| 11 | Data transfers | Relies on providers' DPAs and standard contractual clauses | Sign/accept DPAs with Supabase, Vercel, OpenAI, Stripe, Cloudflare and ImprovMX and confirm data regions (Supabase project region, ImprovMX location). |
| 12 | Automatic re-acceptance | Changes are accepted by clicking through on next sign-in (dashboard banner) and before publishing | Confirm this is enough notice for material changes; there is no email notification system. |

## Product facts the policies promise that are not fully automated

- **Refunds are manual.** Issue them in the Stripe Dashboard (full refunds only). `charge.refunded` then runs
  `record_stripe_refund`: order refunded, entitlement revoked, event archived, RSVPs closed. A refunded event can't be
  re-purchased (checkout returns `renewal_not_available` because the entitlement keeps `launch_order_id`). To check
  eligibility, count `rsvp_submissions` for the event and compare `payments.created_at` / `events.event_ends_at` with
  `launchRefundEligibility()` in `src/lib/payments/refund-policy.ts`.
- **Stripe processing fees are not returned on refunds** (about US$0.88 per $20 charge).
- **Chargebacks are not handled in code.** There is no `charge.dispute.*` webhook; unpublish disputed pages by hand
  or add the handler.
- **The launch AI bonus is not clawed back on refund.** The policy says AI credit has no cash value; decide whether to
  remove it.
- **Security/audit log retention (12 months) has no purge job.** `audit_events` is never deleted today. Add a purge
  or change the Privacy Policy.
- **Abuse logs, content reports and suspension** are being added by other work. Check that the final retention of
  hashed-IP abuse logs and reports, the "Report this page" link wording, and when moderation runs (upload/publish)
  match the Privacy Policy, Cookie Notice and Content Reporting page; change the text and bump the version if not.
- **Backups:** the policy says deleted data stays in provider backups "for a limited time". Confirm the Supabase plan's
  backup retention.
- **Stripe receipts:** Ontario's CPA requires giving the consumer a copy of the internet agreement within 15 days.
  Turn on email receipts in Stripe (Settings → Customer emails) and consider linking the policies there.

## Stripe Dashboard settings to update before going live

- Settings → Public details: Terms URL `https://eventloom.co/legal/terms`, Privacy URL `/legal/privacy`, support email
  `hello@eventloom.co`. `consent_collection.terms_of_service = "required"` fails without a Terms URL.
- Settings → Checkout → Policies: enable the refund policy, 14 days, link `/legal/refunds`.

## Deploying this version

1. Apply `supabase/migrations/20261009140000_legal_documents_2026_10_09.sql` and deploy the commit setting
   `LEGAL_VERSION = "2026-10-09"` back to back. Between the two, checkout and acceptance fail closed
   (`legal_documents_not_ready`); no payment is taken.
2. `/api/health/ready` now expects five active documents at the new version: terms, privacy, refunds,
   acceptable-use, domains.
3. Every existing creator sees "We've updated our terms" on their dashboard and must accept before publishing.
