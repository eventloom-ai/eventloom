create table if not exists public.referral_journeys (
  id uuid primary key default extensions.gen_random_uuid(),
  source_event_id uuid references public.events(id) on delete set null,
  clicked_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  consent_status text not null default 'pending' check (consent_status in ('pending', 'accepted', 'declined')),
  consented_at timestamptz,
  referred_user_id uuid references auth.users(id) on delete set null,
  is_new_account boolean,
  claimed_at timestamptz,
  referred_event_id uuid references public.events(id) on delete set null,
  draft_created_at timestamptz,
  paid_published_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.legal_documents(document_key, version, title, content_sha256, status)
values
  ('terms', '2026-07-24-beta', 'Terms of Service', encode(extensions.digest('terms:2026-07-24-beta', 'sha256'), 'hex'), 'draft'),
  ('privacy', '2026-07-24-beta', 'Privacy Policy', encode(extensions.digest('privacy:2026-07-24-beta', 'sha256'), 'hex'), 'draft'),
  ('acceptable-use', '2026-07-24-beta', 'Acceptable Use Policy', encode(extensions.digest('acceptable-use:2026-07-24-beta', 'sha256'), 'hex'), 'draft'),
  ('cookies', '2026-07-24-beta', 'Cookie and Tracking Notice', encode(extensions.digest('cookies:2026-07-24-beta', 'sha256'), 'hex'), 'draft'),
  ('domains', '2026-07-24-beta', 'Domain Registration Policy', encode(extensions.digest('domains:2026-07-24-beta', 'sha256'), 'hex'), 'draft')
on conflict(document_key, version) do nothing;

create index if not exists referral_journeys_source_clicked_idx
  on public.referral_journeys (source_event_id, clicked_at desc);
create unique index if not exists referral_journeys_referred_user_unique_idx
  on public.referral_journeys (referred_user_id)
  where referred_user_id is not null and withdrawn_at is null;
create unique index if not exists referral_journeys_referred_event_unique_idx
  on public.referral_journeys (referred_event_id)
  where referred_event_id is not null;
create index if not exists referral_journeys_expiry_idx
  on public.referral_journeys (expires_at)
  where referred_user_id is null;

alter table public.referral_journeys enable row level security;
revoke all on table public.referral_journeys from public, anon, authenticated;
grant all on table public.referral_journeys to service_role;

create or replace function public.cleanup_referral_journeys()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.referral_journeys
  where
    (referred_user_id is null and expires_at < now())
    or (referred_user_id is not null and clicked_at < now() - interval '12 months');
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_referral_journeys() from public, anon, authenticated;
grant execute on function public.cleanup_referral_journeys() to service_role;

create or replace function public.referral_funnel_summary()
returns table (
  clicks bigint,
  new_signups bigint,
  existing_creators bigint,
  drafts bigint,
  paid_publications bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::bigint,
    count(*) filter (where is_new_account is true and claimed_at is not null)::bigint,
    count(*) filter (where is_new_account is false and claimed_at is not null)::bigint,
    count(*) filter (where referred_event_id is not null and draft_created_at is not null)::bigint,
    count(*) filter (where paid_published_at is not null)::bigint
  from public.referral_journeys
  where withdrawn_at is null;
$$;

revoke all on function public.referral_funnel_summary() from public, anon, authenticated;
grant execute on function public.referral_funnel_summary() to service_role;

create or replace function public.referral_funnel_by_source()
returns table (
  source_event_id uuid,
  source_slug text,
  source_title text,
  clicks bigint,
  new_signups bigint,
  existing_creators bigint,
  drafts bigint,
  paid_publications bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    journey.source_event_id,
    coalesce(event.slug, 'Deleted event')::text,
    coalesce(nullif(event.config ->> 'title', ''), event.slug, 'Deleted event')::text,
    count(*)::bigint,
    count(*) filter (where journey.is_new_account is true and journey.claimed_at is not null)::bigint,
    count(*) filter (where journey.is_new_account is false and journey.claimed_at is not null)::bigint,
    count(*) filter (where journey.referred_event_id is not null and journey.draft_created_at is not null)::bigint,
    count(*) filter (where journey.paid_published_at is not null)::bigint
  from public.referral_journeys journey
  left join public.events event on event.id = journey.source_event_id
  where journey.withdrawn_at is null
  group by journey.source_event_id, event.slug, event.config
  order by count(*) desc, max(journey.clicked_at) desc;
$$;

revoke all on function public.referral_funnel_by_source() from public, anon, authenticated;
grant execute on function public.referral_funnel_by_source() to service_role;
