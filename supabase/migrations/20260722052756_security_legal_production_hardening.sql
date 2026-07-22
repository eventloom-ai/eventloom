-- Security, privacy, legal-versioning, and lifecycle baseline for the closed beta.
-- Public checkout/domain/RSVP remain application feature-flagged until all
-- external release gates are complete.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Preserve legacy RSVP personal information outside the Data API until a
-- documented retention decision is made.
do $$
begin
  if to_regclass('public.rsvps') is not null then
    execute 'alter table public.rsvps set schema private';
    execute 'revoke all on table private.rsvps from public, anon, authenticated';
  end if;
  if to_regclass('public.rsvp_rate_limits') is not null then
    execute 'alter table public.rsvp_rate_limits set schema private';
    -- The legacy table is a global bucket counter with a different shape. It
    -- must not be reused by the per-event keyed-hash limiter below.
    execute 'alter table private.rsvp_rate_limits rename to legacy_rsvp_rate_limits';
    execute 'revoke all on table private.legacy_rsvp_rate_limits from public, anon, authenticated';
  end if;
end $$;

create table if not exists private.rsvp_rate_limits (
  event_id uuid not null references public.events(id) on delete cascade,
  ip_hash text not null,
  requested_at timestamptz not null default now()
);
create index if not exists rsvp_rate_limits_lookup_idx on private.rsvp_rate_limits (event_id, ip_hash, requested_at desc);
revoke all on table private.rsvp_rate_limits from public, anon, authenticated;
grant all on table private.rsvp_rate_limits to service_role;

alter table public.events
  add column if not exists event_ends_at timestamptz,
  add column if not exists event_timezone text not null default 'America/Toronto',
  add column if not exists rsvp_purge_at timestamptz,
  add column if not exists legal_hold boolean not null default false;

update public.events
set event_ends_at = coalesce(event_ends_at, ends_at),
    event_timezone = coalesce(nullif(event_timezone, ''), timezone),
    rsvp_purge_at = coalesce(rsvp_purge_at, coalesce(event_ends_at, ends_at) + interval '90 days')
where event_ends_at is null or rsvp_purge_at is null;

alter table public.event_settings
  add column if not exists controller_legal_name text,
  add column if not exists privacy_contact text,
  add column if not exists collection_purpose text,
  add column if not exists optional_field_justification text;

alter table public.rsvp_submissions add column if not exists idempotency_key uuid;
create unique index if not exists rsvp_submission_event_idempotency_idx on public.rsvp_submissions(event_id, idempotency_key) where idempotency_key is not null;

-- Browser clients cannot write RSVP personal information directly. All rows
-- are created through submit_public_rsvp with the service role.
drop policy if exists "Public can RSVP to published open events" on public.rsvp_submissions;
drop policy if exists "Public can insert RSVP guests" on public.rsvp_guests;
drop policy if exists "Public can insert RSVP answers" on public.rsvp_answers;
revoke insert, update, delete on public.rsvp_submissions from anon, authenticated;
revoke insert, update, delete on public.rsvp_guests from anon, authenticated;
revoke insert, update, delete on public.rsvp_answers from anon, authenticated;
revoke all on public.rsvp_submissions, public.rsvp_guests, public.rsvp_answers from anon;

-- Ownerless generation jobs must never become a cross-tenant shared queue.
drop policy if exists "Members can read jobs" on public.generation_jobs;
drop policy if exists "Members can create jobs" on public.generation_jobs;
drop policy if exists "Members can update jobs" on public.generation_jobs;
create policy "Members can read owned jobs" on public.generation_jobs for select to authenticated
  using (owner_id = (select auth.uid()) or (event_id is not null and public.is_event_member(event_id)));
create policy "Members can create owned jobs" on public.generation_jobs for insert to authenticated
  with check (owner_id = (select auth.uid()) and event_id is not null and public.is_event_member(event_id));
create policy "Members can update owned jobs" on public.generation_jobs for update to authenticated
  using (owner_id = (select auth.uid()) and event_id is not null and public.is_event_member(event_id))
  with check (owner_id = (select auth.uid()) and event_id is not null and public.is_event_member(event_id));

-- Organization creation and initial ownership are one transaction.
drop policy if exists "Authenticated users can create organizations" on public.organizations;
drop policy if exists "Users can create initial organization ownership" on public.organization_members;
revoke insert on public.organizations, public.organization_members from authenticated;

create or replace function public.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  created_id uuid;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if length(btrim(p_name)) not between 1 and 120
    or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(p_slug) not between 3 and 63 then
    raise exception 'invalid_organization';
  end if;
  insert into public.organizations(name, slug) values (btrim(p_name), p_slug) returning id into created_id;
  insert into public.organization_members(organization_id, user_id, role) values (created_id, actor, 'owner');
  return created_id;
end;
$$;
revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated, service_role;

-- Current RSVP form, event status, entitlement, duplicate protection, rate
-- limit, submission, guests, and answers are validated/written atomically.
create or replace function public.submit_public_rsvp(
  p_event_id uuid,
  p_idempotency_key uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_is_attending boolean,
  p_party_size integer,
  p_guest_names text[],
  p_answers jsonb,
  p_ip_hash text,
  p_user_agent_class text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_form_id uuid;
  submission_id uuid;
  requested_at timestamptz := now();
  guest_name text;
begin
  if p_idempotency_key is null or p_event_id is null then raise exception 'invalid_request'; end if;
  select s.id into submission_id from public.rsvp_submissions s
    where s.event_id = p_event_id and s.idempotency_key = p_idempotency_key;
  if submission_id is not null then return submission_id; end if;

  if length(btrim(p_first_name)) not between 1 and 80
    or length(btrim(p_last_name)) not between 1 and 80
    or p_party_size not between 0 and 50
    or (not p_is_attending and (p_party_size <> 0 or cardinality(p_guest_names) <> 0))
    or (p_is_attending and p_party_size < 1)
    or cardinality(p_guest_names) > 50
  then raise exception 'invalid_request'; end if;

  select f.id into active_form_id
  from public.events e
  join public.event_entitlements en on en.event_id = e.id
  join public.rsvp_forms f on f.event_id = e.id and f.status = 'active'
  where e.id = p_event_id
    and e.status = 'published'
    and e.rsvp_open = true
    and e.public_rsvp_enabled = true
    and (e.rsvp_deadline_at is null or e.rsvp_deadline_at > requested_at)
    and en.status = 'active'
    and en.expires_at > requested_at
  order by f.updated_at desc
  limit 1
  for update of e;
  if active_form_id is null then raise exception 'rsvp_unavailable'; end if;

  if p_ip_hash is not null then
    delete from private.rsvp_rate_limits where requested_at < now() - interval '30 days';
    if (select count(*) from private.rsvp_rate_limits where event_id = p_event_id and ip_hash = p_ip_hash and requested_at > now() - interval '10 minutes') >= 10
      then raise exception 'rate_limit';
    end if;
    insert into private.rsvp_rate_limits(event_id, ip_hash) values (p_event_id, p_ip_hash);
  end if;

  insert into public.rsvp_submissions(event_id, form_id, idempotency_key, first_name, last_name, email, phone, is_attending, party_size, answers, ip_hash, user_agent)
  values (p_event_id, active_form_id, p_idempotency_key, btrim(p_first_name), btrim(p_last_name), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''), p_is_attending, p_party_size, coalesce(p_answers, '{}'::jsonb), p_ip_hash, left(coalesce(p_user_agent_class, 'unknown'), 160))
  returning id into submission_id;

  foreach guest_name in array coalesce(p_guest_names, '{}'::text[]) loop
    if length(btrim(guest_name)) not between 1 and 160 then raise exception 'invalid_request'; end if;
    insert into public.rsvp_guests(submission_id, event_id, name) values (submission_id, p_event_id, btrim(guest_name));
  end loop;

  insert into public.rsvp_answers(submission_id, event_id, field_id, field_key, value, value_json)
  select submission_id, p_event_id, f.id, a.key, left(a.value, 500), to_jsonb(left(a.value, 500))
  from jsonb_each_text(coalesce(p_answers, '{}'::jsonb)) a
  join public.rsvp_fields f on f.form_id = active_form_id and f.field_key = a.key;

  insert into public.audit_events(event_id, actor_type, action, target_type, target_id, metadata)
  values (p_event_id, 'guest', 'rsvp.submitted', 'rsvp_submission', submission_id, jsonb_build_object('attending', p_is_attending, 'party_size', p_party_size));
  return submission_id;
end;
$$;
revoke all on function public.submit_public_rsvp(uuid, uuid, text, text, text, text, boolean, integer, text[], jsonb, text, text) from public, anon, authenticated;
grant execute on function public.submit_public_rsvp(uuid, uuid, text, text, text, text, boolean, integer, text[], jsonb, text, text) to service_role;

-- Versioned policies and recorded acceptance.
create table if not exists public.legal_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  document_key text not null,
  version text not null,
  title text not null,
  content_sha256 text not null,
  status text not null check (status in ('draft', 'active', 'retired')),
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique(document_key, version)
);
create table if not exists public.legal_acceptances (
  id uuid primary key default extensions.gen_random_uuid(),
  document_id uuid not null references public.legal_documents(id),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  accepted_at timestamptz not null default now(),
  user_agent_class text,
  ip_hash text,
  unique(document_id, user_id, order_id)
);
create table if not exists public.privacy_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  requester_user_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  request_type text not null check (request_type in ('access', 'correction', 'deletion', 'information', 'appeal')),
  status text not null default 'received' check (status in ('received', 'identity_verification', 'in_progress', 'completed', 'denied')),
  contact_ciphertext text not null,
  due_at timestamptz not null default (now() + interval '30 days'),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.event_legal_holds (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  reason text not null,
  placed_by uuid references auth.users(id) on delete set null,
  placed_at timestamptz not null default now(),
  review_at timestamptz not null,
  released_at timestamptz
);

-- Durable provider event/outbox and retry history. Raw provider payloads and
-- registrant contacts are intentionally excluded.
create table if not exists public.provider_webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  status text not null default 'received' check (status in ('received', 'verified', 'processed', 'retry', 'failed')),
  attempt_count integer not null default 0,
  last_error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, provider_event_id)
);
create table if not exists public.fulfillment_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  state text not null default 'received' check (state in ('received', 'verified', 'service_active', 'domain_pending', 'domain_active', 'retry', 'failed', 'refunded')),
  next_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  last_error_code text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id)
);
create table if not exists public.fulfillment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.fulfillment_jobs(id) on delete cascade,
  state text not null,
  outcome text not null check (outcome in ('started', 'succeeded', 'retry', 'failed')),
  error_code text,
  created_at timestamptz not null default now()
);
create table if not exists public.domain_registrant_payloads (
  order_id uuid primary key references public.orders(id) on delete cascade,
  ciphertext text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.domains
  add column if not exists registrant_reference text,
  add column if not exists expires_at timestamptz,
  add column if not exists renewal_status text not null default 'manual',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists transfer_status text not null default 'locked';

alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.event_legal_holds enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.fulfillment_jobs enable row level security;
alter table public.fulfillment_attempts enable row level security;
alter table public.domain_registrant_payloads enable row level security;

create policy "Users read own legal acceptances" on public.legal_acceptances for select to authenticated using (user_id = (select auth.uid()));
create policy "Users read own privacy requests" on public.privacy_requests for select to authenticated using (requester_user_id = (select auth.uid()));
create policy "Event owners read holds" on public.event_legal_holds for select to authenticated using (public.is_event_owner(event_id));
create policy "Event owners read fulfillment" on public.fulfillment_jobs for select to authenticated using (event_id is not null and public.is_event_owner(event_id));
create policy "Event owners read attempts" on public.fulfillment_attempts for select to authenticated using (exists (select 1 from public.fulfillment_jobs j where j.id = job_id and j.event_id is not null and public.is_event_owner(j.event_id)));

revoke all on public.legal_documents, public.legal_acceptances, public.privacy_requests, public.event_legal_holds, public.provider_webhook_events, public.fulfillment_jobs, public.fulfillment_attempts, public.domain_registrant_payloads from public, anon, authenticated;
grant select on public.legal_acceptances, public.privacy_requests, public.event_legal_holds, public.fulfillment_jobs, public.fulfillment_attempts to authenticated;
grant all on public.legal_documents, public.legal_acceptances, public.privacy_requests, public.event_legal_holds, public.provider_webhook_events, public.fulfillment_jobs, public.fulfillment_attempts to service_role;
grant all on public.domain_registrant_payloads to service_role;

insert into public.legal_documents(document_key, version, title, content_sha256, status)
values
  ('terms', '2026-07-22-beta', 'Terms of Service', encode(extensions.digest('terms:2026-07-22-beta', 'sha256'), 'hex'), 'draft'),
  ('privacy', '2026-07-22-beta', 'Privacy Policy', encode(extensions.digest('privacy:2026-07-22-beta', 'sha256'), 'hex'), 'draft'),
  ('refunds', '2026-07-22-beta', 'Refund and Cancellation Policy', encode(extensions.digest('refunds:2026-07-22-beta', 'sha256'), 'hex'), 'draft'),
  ('domains', '2026-07-22-beta', 'Domain Registration Policy', encode(extensions.digest('domains:2026-07-22-beta', 'sha256'), 'hex'), 'draft')
on conflict(document_key, version) do nothing;

create or replace function public.purge_expired_rsvp_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count integer;
begin
  with deleted as (
    delete from public.rsvp_submissions s
    using public.events e
    where s.event_id = e.id
      and e.rsvp_purge_at is not null
      and e.rsvp_purge_at <= now()
      and e.legal_hold = false
      and not exists (select 1 from public.event_legal_holds h where h.event_id = e.id and h.released_at is null)
    returning s.id
  ) select count(*) into deleted_count from deleted;
  delete from private.rsvp_rate_limits where requested_at < now() - interval '30 days';
  return deleted_count;
end;
$$;
revoke all on function public.purge_expired_rsvp_data() from public, anon, authenticated;
grant execute on function public.purge_expired_rsvp_data() to service_role;

-- Helper functions used by RLS stay callable only where needed; triggers and
-- privileged mutation functions are never directly executable by browsers.
revoke all on function public.organization_has_no_members(uuid) from public, anon, authenticated;
revoke all on function public.ensure_event_organization() from public, anon, authenticated;
revoke all on function public.ensure_event_defaults() from public, anon, authenticated;
revoke all on function public.reserve_ai_build_credit(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.grant_launch_ai_credit(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.refund_ai_build_credit(uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.ensure_event_organization(), public.ensure_event_defaults() to service_role;

-- New uploads are private. Existing event-assets URLs are intentionally made
-- private during the closed beta and must be republished through the proxy.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('event-assets-private', 'event-assets-private', false, 10485760, array['image/webp']::text[])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
update storage.buckets set public = false where id = 'event-assets';

create index if not exists events_rsvp_purge_idx on public.events(rsvp_purge_at) where rsvp_purge_at is not null and legal_hold = false;
create index if not exists privacy_requests_due_idx on public.privacy_requests(status, due_at);
create index if not exists provider_webhook_retry_idx on public.provider_webhook_events(status, received_at);
create index if not exists fulfillment_jobs_retry_idx on public.fulfillment_jobs(state, next_attempt_at);

-- Account erasure is an atomic, service-only operation. Financial/legal
-- records are detached and retained; creator content and RSVP data are erased.
alter table public.payments alter column event_id drop not null;
alter table public.payments drop constraint if exists payments_event_id_fkey;
alter table public.payments add constraint payments_event_id_fkey foreign key (event_id) references public.events(id) on delete set null;

create or replace function public.delete_creator_account(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare owned_event_ids uuid[];
declare owned_org_ids uuid[];
begin
  select coalesce(array_agg(id), '{}'::uuid[]) into owned_event_ids from public.events where owner_id = p_user_id;
  if exists (
    select 1 from public.domains
    where event_id = any(owned_event_ids)
      and status in ('registered', 'vercel_pending', 'ready')
  ) then
    raise exception 'active_domain_transfer_required';
  end if;

  select coalesce(array_agg(organization_id), '{}'::uuid[]) into owned_org_ids
  from public.organization_members where user_id = p_user_id and role = 'owner';

  update public.payments set event_id = null where event_id = any(owned_event_ids);
  update public.orders set event_id = null, organization_id = null
    where event_id = any(owned_event_ids) or organization_id = any(owned_org_ids);
  update public.legal_acceptances set user_id = null where user_id = p_user_id;
  update public.privacy_requests set requester_user_id = null where requester_user_id = p_user_id;
  delete from public.events where id = any(owned_event_ids);
  delete from public.organization_members where user_id = p_user_id;
  delete from public.organizations o where o.id = any(owned_org_ids)
    and not exists (select 1 from public.organization_members m where m.organization_id = o.id);
  return true;
end;
$$;
revoke all on function public.delete_creator_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_creator_account(uuid) to service_role;

revoke execute on function public.is_event_member(uuid) from public, anon;
revoke execute on function public.is_event_owner(uuid) from public, anon;
