<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

`eventloom` is a single Next.js 16 (Turbopack) app — one deployment hosts many tenant event sites. There is no separate backend service; API routes live under `src/app/api`. Dependencies are refreshed by the startup update script (`npm install`), so you normally only need to run the app and checks.

- Commands are the standard `package.json` scripts: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test` (vitest), `npm run build`. `npm run verify` chains typecheck + lint + test + build + audit.
- Local demo mode vs. configured mode: with no Supabase env vars set, the app falls back to an in-memory demo store and mock domains, and `/app` is reachable without login. If `NEXT_PUBLIC_SUPABASE_URL` and a Supabase key are BOTH non-empty (e.g. from blindly `cp .env.example .env.local`), the app assumes auth is configured and redirects `/app` to `/login`, but the placeholder keys don't point at a real project so nothing works. For keyless local dev, leave the Supabase vars unset (a minimal `.env.local` with just `NEXT_PUBLIC_APP_URL` is enough). `.env.local` is gitignored.
- Hello-world flow (demo mode): landing page → describe an event → "Start building" → answer the short questionnaire → a draft event site is generated at `/<slug>` (e.g. `/birthday-cozy-autumn`). Publishing/RSVP submission require Stripe + Supabase, so a demo-mode event stays an unpublished draft with RSVP closed.
- Known caveat: the in-studio "Canvas" preview iframe fails with "localhost refused to connect" because `next.config.ts` sets `X-Frame-Options: DENY` (plus CSP `frame-ancestors`) on every route, which blocks even same-origin framing. This is expected app behavior, not a broken environment — open the generated event URL directly in a new tab to view the page.
