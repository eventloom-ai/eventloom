create table if not exists public.maintenance_status (
  job_key text primary key,
  last_started_at timestamptz not null,
  last_succeeded_at timestamptz,
  last_failed_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now(),
  constraint maintenance_status_job_key_format check (job_key ~ '^[a-z][a-z0-9_-]{0,63}$'),
  constraint maintenance_status_error_code_format check (
    last_error_code is null or last_error_code ~ '^[a-z][a-z0-9_-]{0,63}$'
  )
);

comment on table public.maintenance_status is
  'Server-only, non-PII heartbeat for scheduled operational maintenance.';

alter table public.maintenance_status enable row level security;

revoke all on table public.maintenance_status from public, anon, authenticated;
grant select, insert, update on table public.maintenance_status to service_role;

drop policy if exists "Browser access denied" on public.maintenance_status;
create policy "Browser access denied"
on public.maintenance_status
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
