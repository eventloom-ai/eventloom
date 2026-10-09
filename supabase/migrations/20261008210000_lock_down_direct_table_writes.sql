-- Close direct PostgREST paths that bypass app-level checks. Every legitimate
-- write to these tables goes through the service role in server routes.

-- Domains: users could insert rows for arbitrary hostnames and hijack tenant
-- subdomains or squat custom domains before paid fulfillment claimed them.
drop policy if exists "Members insert rows" on public.domains;
drop policy if exists "Members update rows" on public.domains;
drop policy if exists "Members delete rows" on public.domains;
revoke insert, update, delete on table public.domains from authenticated, anon;

-- RSVP data: the dashboard and export read through the service role after an
-- MFA check, so a password-only (aal1) session must not read guest PII directly.
drop policy if exists "Members can read submissions" on public.rsvp_submissions;
drop policy if exists "Members can read guests" on public.rsvp_guests;
drop policy if exists "Members can read answers" on public.rsvp_answers;
revoke select, insert, update, delete on table public.rsvp_submissions from authenticated, anon;
revoke select, insert, update, delete on table public.rsvp_guests from authenticated, anon;
revoke select, insert, update, delete on table public.rsvp_answers from authenticated, anon;

-- Assets: metadata.bucket/path is trusted by service-role reads and deletes.
-- Builds may still insert reference rows; nobody edits or deletes them directly.
drop policy if exists "Members update rows" on public.assets;
drop policy if exists "Members delete rows" on public.assets;
revoke update, delete on table public.assets from authenticated, anon;

-- Profiles: legal onboarding flags are set only by /api/legal/accept.
revoke update on table public.profiles from authenticated, anon;
grant update (full_name) on table public.profiles to authenticated;
