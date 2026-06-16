alter table public.generation_jobs
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists slug text,
  add column if not exists progress_step text,
  add column if not exists progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  add column if not exists progress_message text,
  add column if not exists result_config jsonb;

create index if not exists generation_jobs_owner_status_idx on public.generation_jobs (owner_id, status, created_at desc);

drop policy if exists "Members can update jobs" on public.generation_jobs;
create policy "Members can update jobs" on public.generation_jobs
  for update
  using (owner_id = auth.uid() or event_id is null or public.is_event_member(event_id))
  with check (owner_id = auth.uid() or event_id is null or public.is_event_member(event_id));
