alter table public.event_versions
  add column if not exists document jsonb,
  add column if not exists parent_version_id uuid references public.event_versions(id) on delete set null,
  add column if not exists source text not null default 'legacy'
    check (source in ('initial', 'ai', 'manual', 'restore', 'legacy')),
  add column if not exists summary text not null default '';

alter table public.events
  add column if not exists draft_version_id uuid references public.event_versions(id) on delete set null,
  add column if not exists published_version_id uuid references public.event_versions(id) on delete set null;

alter table public.page_artifacts
  add column if not exists version_id uuid references public.event_versions(id) on delete set null;

alter table public.orders
  add column if not exists site_version_id uuid references public.event_versions(id) on delete set null;

alter table public.generation_jobs
  add column if not exists kind text not null default 'initial'
    check (kind in ('initial', 'edit', 'upgrade')),
  add column if not exists base_version_id uuid references public.event_versions(id) on delete set null,
  add column if not exists result_version_id uuid references public.event_versions(id) on delete set null,
  add column if not exists response_id text,
  add column if not exists cancel_requested boolean not null default false,
  add column if not exists selected_node_ids text[] not null default '{}'::text[];

alter table public.ai_credit_ledger
  add column if not exists job_id uuid unique references public.generation_jobs(id) on delete set null;

alter table public.ai_credit_ledger drop constraint if exists ai_credit_ledger_reason_check;
alter table public.ai_credit_ledger add constraint ai_credit_ledger_reason_check
  check (reason in ('trial_grant', 'build', 'refund', 'launch_bonus', 'admin_adjustment'));

create table if not exists public.builder_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  run_id uuid references public.generation_jobs(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null check (length(content) between 1 and 12000),
  selected_node_ids text[] not null default '{}'::text[],
  version_id uuid references public.event_versions(id) on delete set null,
  status text not null default 'complete' check (status in ('pending', 'complete', 'failed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  type text not null check (type in ('status', 'patch', 'message', 'committed', 'error', 'cancelled')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, sequence)
);

create index if not exists event_versions_event_created_idx
  on public.event_versions (event_id, created_at desc);
create index if not exists builder_messages_event_created_idx
  on public.builder_messages (event_id, created_at);
create index if not exists generation_job_events_job_sequence_idx
  on public.generation_job_events (job_id, sequence);

-- Older deployments could already contain overlapping runs. Keep the newest one
-- active and close the rest before enforcing the one-run-per-event invariant.
with ranked_running_jobs as (
  select id, row_number() over (partition by event_id order by created_at desc, id desc) as position
  from public.generation_jobs
  where status = 'running' and event_id is not null
)
update public.generation_jobs jobs
set status = 'failed',
    error = coalesce(jobs.error, 'Superseded while enabling the visual studio'),
    completed_at = coalesce(jobs.completed_at, now())
from ranked_running_jobs ranked
where jobs.id = ranked.id and ranked.position > 1;

create unique index if not exists generation_jobs_one_running_per_event_idx
  on public.generation_jobs (event_id)
  where status = 'running' and event_id is not null;

alter table public.builder_messages enable row level security;
alter table public.generation_job_events enable row level security;

drop policy if exists "Members can read builder messages" on public.builder_messages;
create policy "Members can read builder messages" on public.builder_messages
  for select to authenticated
  using (public.is_event_member(event_id));

drop policy if exists "Members can create builder messages" on public.builder_messages;
create policy "Members can create builder messages" on public.builder_messages
  for insert to authenticated
  with check (public.is_event_member(event_id) and created_by = (select auth.uid()));

drop policy if exists "Members can read generation events" on public.generation_job_events;
create policy "Members can read generation events" on public.generation_job_events
  for select to authenticated
  using (public.is_event_member(event_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-assets',
  'event-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Event members can upload event assets" on storage.objects;
create policy "Event members can upload event assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-assets'
    and exists (
      select 1 from public.event_members membership
      where membership.event_id::text = (storage.foldername(name))[1]
        and membership.user_id = (select auth.uid())
    )
  );

drop policy if exists "Event members can update event assets" on storage.objects;
create policy "Event members can update event assets" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-assets'
    and exists (
      select 1 from public.event_members membership
      where membership.event_id::text = (storage.foldername(name))[1]
        and membership.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'event-assets'
    and exists (
      select 1 from public.event_members membership
      where membership.event_id::text = (storage.foldername(name))[1]
        and membership.user_id = (select auth.uid())
    )
  );

drop policy if exists "Event members can delete event assets" on storage.objects;
create policy "Event members can delete event assets" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-assets'
    and exists (
      select 1 from public.event_members membership
      where membership.event_id::text = (storage.foldername(name))[1]
        and membership.user_id = (select auth.uid())
    )
  );

grant select, insert on table public.builder_messages to authenticated;
grant all on table public.builder_messages to service_role;
grant select on table public.generation_job_events to authenticated;
grant all on table public.generation_job_events to service_role;
grant usage, select on sequence public.generation_job_events_id_seq to service_role;

create or replace function public.refund_ai_build_credit(
  p_user_id uuid,
  p_event_id uuid,
  p_job_id uuid,
  p_amount_cents integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if p_amount_cents <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  insert into public.ai_credit_ledger (user_id, event_id, job_id, delta_cents, reason)
  values (p_user_id, p_event_id, p_job_id, p_amount_cents, 'refund')
  on conflict (job_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    update public.ai_credit_accounts
    set available_cents = available_cents + p_amount_cents, updated_at = now()
    where user_id = p_user_id;
  end if;
  return inserted_count > 0;
end;
$$;

revoke all on function public.refund_ai_build_credit(uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.refund_ai_build_credit(uuid, uuid, uuid, integer) to service_role;
