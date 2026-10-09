# Launch checklist: taking live payments

Status as of 2026-10-09. ✅ = done and verified in production.

## App readiness (done)
- ✅ Security audit fixes: domain hijack, MFA-bypassing guest reads, free-AI-credit minting, direct database writes (all app writes go through the server after ownership checks), asset path trust, reserved addresses (app + database), duplicate checkouts, test-mode Stripe refused in production, async payments.
- ✅ Durable rate limiting on every write/cost route (Postgres-backed; verified 429 in production).
- ✅ Content safety: OpenAI moderation of briefs, studio messages, photos and page text; phishing-style pages held at publish; "Report this page" on every event page; admin takedown (`/admin`, MFA) returning a neutral 410.
- ✅ Policies live (version 2026-10-09): Terms, Privacy, Refunds, Acceptable Use, Content Reporting, Copyright, Cookies, Subprocessors, DPA, Accessibility, Security. Checkout requires accepting Terms + Privacy + Refunds; existing users re-accept on next sign-in.
- ✅ Checkout and public RSVPs enabled in production; legal identity set; contact email hello@eventloom.co forwards to the owner.

## Owner actions before switching Stripe live (in order)
1. **Email sending for sign-ups.** Supabase's built-in mailer is capped at ~2 emails/hour for the whole project, so confirmation emails stall after the first few sign-ups. Create a free account with an email provider (e.g. Resend or Brevo), then Claude adds its DNS records and the SMTP settings in Supabase → Authentication → SMTP.
2. **Supabase → Authentication:**
   - Attack Protection: enable CAPTCHA → Cloudflare Turnstile, secret = the same value as Vercel `TURNSTILE_SECRET_KEY`. (The site key is already set in production and the sign-in/sign-up forms send the token.)
   - Rate limits: sign-ups and sign-ins 30 per 5 min per IP; token verifications 30 per 5 min; token refreshes 150 per 5 min.
   - Keep "Confirm email" on; minimum interval between emails 60 s.
3. **Stripe Dashboard (live mode):**
   - Account activated, bank account added and verified under Settings → Payouts.
   - Settings → Public details: business name "Eventloom", support email hello@eventloom.co, Terms URL https://eventloom.co/legal/terms, Privacy URL https://eventloom.co/legal/privacy (Checkout's required terms checkbox fails without a Terms URL).
   - Settings → Checkout: show the refund policy (https://eventloom.co/legal/refunds); Emails: successful-payment receipts on.
   - Developers → Webhooks: endpoint `https://eventloom.co/api/stripe/webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`.
   - In Vercel production: `STRIPE_SECRET_KEY` = live secret key (`sk_live_…` or restricted `rk_live_…`), `STRIPE_WEBHOOK_SECRET` = the live endpoint's signing secret. Production refuses test keys and test-mode webhook events.
4. **One real end-to-end purchase.** Publish one of your own events for $20 with a real card, confirm the page goes live and RSVPs open, then refund it from the Stripe Dashboard and confirm the page unpublishes.

Claude can do steps 1–3 in the owner's Chrome (or via the Stripe connector after `/mcp` authorization) once the owner has signed in to each service; entering keys/passwords stays with the owner.

## Legal (before or soon after launch)
See `docs/legal/OWNER-REVIEW.md`: lawyer review of refund rule (EU withdrawal right), liability cap, governing law; register the business name in Ontario; consider a non-home mailing address on the policies; GST/HST registration once revenue passes CAD $30k; US DMCA agent registration.

## Fix soon (engineering agent backlog)
- CSP enforcement: collect report data first; login/signup/reset/privacy-request pages need the static policy before enforcing.
- MFA on event deletion (it deletes RSVPs); open-redirect guard on `/app/security?next=`; job-status endpoint requires a session; draft-version ownership check.
- Published photos stay cached up to 24 h after unpublish/takedown; restrict event images to uploaded assets only.
- Fail closed (no demo fallback) if production service-role config is ever missing; readiness check should require `IP_HASH_SECRET`.
