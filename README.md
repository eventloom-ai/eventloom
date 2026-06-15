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

## Supabase

Apply `supabase/migrations/20260615000100_eventloom_platform.sql` to create the multi-tenant schema and Row Level Security policies.
