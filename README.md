# Eventloom AI

AI event website and RSVP platform. One Next.js deployment hosts many customer event sites through slugs, subdomains, and custom domains.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs without production service keys by falling back to a demo event and mock domain results. Supabase, Stripe, Vercel domain management, Cloudflare Registrar, and AI generation become active when their environment variables are configured.

## Core Model

- One Vercel app hosts all events.
- Supabase stores tenants, generated page artifacts, domains, payments, and RSVPs.
- AI may generate frontend page artifacts only.
- RSVP, auth, payments, domain registration, and database access remain platform-owned.
- Domain registration is only attempted after successful payment and price-cap validation.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Launch billing and AI credit policy

- Publishing an event uses a server-created Stripe Checkout session for **$20 USD**.
- Stripe's signed `checkout.session.completed` webhook activates the site for one year; returning to the success page alone never publishes it.
- A new account starts with $5 of build credit. Each complete AI build reserves $0.50 from a server-side, atomic ledger. A paid launch adds a further $5.
- Public published sites require an active entitlement. After the one-year term, access expires without charging the initial $20 launch price again.

After applying the latest migration, add `https://YOUR_DOMAIN/api/stripe/webhook` as a Stripe webhook endpoint and subscribe it to `checkout.session.completed`. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; the launch amount is owned by the server and cannot be changed by the browser.

Renewal and traffic upgrades are deliberately not priced in code yet. Add those products before offering renewals rather than reusing the launch price.

## Supabase

Apply `supabase/migrations/20260615000100_eventloom_platform.sql` to create the multi-tenant schema and Row Level Security policies.

For existing installations, apply migrations in order. The 2026-07-02 schema
expansion is additive: it creates organization, invite, configurable RSVP form,
order, and audit tables while backfilling existing events without deleting RSVP
data. See `docs/schema-redesign.md` for the data model and migration behavior.
