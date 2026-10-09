-- User safety: guest abuse reports and platform-admin takedowns.
--
-- Suspension is two nullable columns rather than a new events.status value: `status` is checked by
-- submit_public_rsvp, the launch fulfillment RPC, dashboards and the publish flow, and an admin who lifts a
-- suspension must get the event back exactly as it was (published or draft). A suspended event is unavailable
-- on every host, takes no RSVPs and cannot be (re)published, whatever its status.

alter table public.events
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text check (suspension_reason is null or char_length(suspension_reason) between 1 and 120);

create index if not exists events_suspended_at_idx on public.events (suspended_at) where suspended_at is not null;

-- Owners may update their events through the Data API ("Owners update events"), so the suspension columns are
-- guarded by a trigger: only the service role (server routes) or a database superuser can set or clear them.
create or replace function private.protect_event_suspension()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.suspended_at is distinct from old.suspended_at or new.suspension_reason is distinct from old.suspension_reason)
    and current_user in ('anon', 'authenticated')
  then
    raise exception 'suspension_admin_only' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_event_suspension() from public, anon, authenticated;

drop trigger if exists events_protect_suspension on public.events;
create trigger events_protect_suspension
  before update of suspended_at, suspension_reason on public.events
  for each row
  execute function private.protect_event_suspension();

-- An insert may not arrive pre-suspended or pre-cleared by a browser client either.
create or replace function private.reject_client_suspension_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.suspended_at is not null or new.suspension_reason is not null) and current_user in ('anon', 'authenticated') then
    raise exception 'suspension_admin_only' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_client_suspension_insert() from public, anon, authenticated;

drop trigger if exists events_reject_client_suspension_insert on public.events;
create trigger events_reject_client_suspension_insert
  before insert on public.events
  for each row
  execute function private.reject_client_suspension_insert();

-- Abuse reports from the public "Report this page" form. Server-route (service role) access only.
create table if not exists public.abuse_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 1 and 63),
  reason text not null check (reason in ('phishing', 'hate', 'sexual', 'violence', 'impersonation', 'copyright', 'privacy', 'other')),
  details text not null default '' check (char_length(details) <= 2000),
  -- Only when the reporter chose to leave one, for follow-up.
  reporter_email text check (reporter_email is null or (char_length(reporter_email) between 3 and 254 and reporter_email like '%_@_%')),
  ip_hash text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

alter table public.abuse_reports enable row level security;
revoke all on table public.abuse_reports from public, anon, authenticated;
grant select, insert, update, delete on table public.abuse_reports to service_role;

drop policy if exists "Abuse reports have no direct browser access" on public.abuse_reports;
create policy "Abuse reports have no direct browser access"
  on public.abuse_reports
  for all
  to anon, authenticated
  using (false)
  with check (false);

create index if not exists abuse_reports_open_idx on public.abuse_reports (created_at desc) where status in ('new', 'reviewing');
create index if not exists abuse_reports_event_idx on public.abuse_reports (event_id) where event_id is not null;
create index if not exists abuse_reports_ip_created_idx on public.abuse_reports (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists abuse_reports_resolved_by_idx on public.abuse_reports (resolved_by) where resolved_by is not null;

comment on table public.abuse_reports is
  'Guest reports of event pages (phishing, hate, sexual content, …). Written by /api/reports, triaged on /admin.';

-- RSVPs: a suspended event takes no replies. Same function as 20261008211500 plus `e.suspended_at is null`.
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
  request_time timestamptz := now();
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
    and e.suspended_at is null
    and e.rsvp_open = true
    and e.public_rsvp_enabled = true
    and (e.rsvp_deadline_at is null or e.rsvp_deadline_at > request_time)
    and en.status = 'active'
    and en.expires_at > request_time
  order by f.updated_at desc
  limit 1
  for share of e;
  if active_form_id is null then raise exception 'rsvp_unavailable'; end if;

  if p_ip_hash is not null then
    delete from private.rsvp_rate_limits as limits
    where limits.requested_at < now() - interval '30 days';
    if (
      select count(*)
      from private.rsvp_rate_limits as limits
      where limits.event_id = p_event_id
        and limits.ip_hash = p_ip_hash
        and limits.requested_at > now() - interval '10 minutes'
    ) >= 30 then
      raise exception 'rate_limit';
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
  from (
    select key, value from jsonb_each_text(coalesce(p_answers, '{}'::jsonb))
    where key ~ '^[a-z][a-z0-9_]{0,47}$' and btrim(value) <> ''
    limit 30
  ) a
  left join public.rsvp_fields f on f.form_id = active_form_id and f.field_key = a.key;

  insert into public.audit_events(event_id, actor_type, action, target_type, target_id, metadata)
  values (p_event_id, 'guest', 'rsvp.submitted', 'rsvp_submission', submission_id, jsonb_build_object('attending', p_is_attending, 'party_size', p_party_size));
  return submission_id;
end;
$$;

revoke all on function public.submit_public_rsvp(uuid, uuid, text, text, text, text, boolean, integer, text[], jsonb, text, text)
from public, anon, authenticated;
grant execute on function public.submit_public_rsvp(uuid, uuid, text, text, text, text, boolean, integer, text[], jsonb, text, text)
to service_role;
