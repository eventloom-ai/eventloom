# Decisions

## 2026-10-08 — Claude manages Eventloom day to day
Owner delegated engineering, ops, user monitoring and marketing to Claude agents. Marketing budget is $0 (organic only). Outward-facing actions (public posts, emails to users, pricing, payments, registrar, applying prod DB migrations) still need owner approval.

## 2026-10-08 — Safe local testing uses demo mode
`.env.local` points at production services. Hands-on testing uses the `eventloom-demo` launch config (port 3001), which blanks Supabase/Stripe/registrar env so nothing real is touched.
