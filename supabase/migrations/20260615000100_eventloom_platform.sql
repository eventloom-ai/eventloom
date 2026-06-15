create extension if not exists "pgcrypto" with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 63),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  rsvp_open boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.event_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  prompt text not null,
  config jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.page_artifacts (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  html text not null,
  css text not null default '',
  model text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null,
  url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.domains (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  domain text not null unique,
  status text not null default 'searching' check (status in ('searching', 'quoted', 'registered', 'vercel_pending', 'ready', 'failed')),
  registration_cost_usd numeric(10,2),
  renewal_cost_usd numeric(10,2),
  provider_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stripe_session_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  amount_total integer not null default 0,
  currency text not null default 'usd',
  created_at timestamptz not null default now()
);

create table public.generation_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  prompt text not null,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.rsvp_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null check (length(first_name) between 1 and 80),
  last_name text not null check (length(last_name) between 1 and 80),
  email text,
  phone text,
  is_attending boolean not null,
  party_size integer not null default 0 check (party_size between 0 and 50),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rsvp_guests (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.rsvp_submissions(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(name) between 1 and 160),
  created_at timestamptz not null default now()
);

create table public.rsvp_answers (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.rsvp_submissions(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  field_key text not null,
  value text not null,
  created_at timestamptz not null default now()
);

create function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    left join public.event_members m on m.event_id = e.id
    where e.id = p_event_id
      and (e.owner_id = auth.uid() or m.user_id = auth.uid())
  );
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.event_versions enable row level security;
alter table public.page_artifacts enable row level security;
alter table public.assets enable row level security;
alter table public.domains enable row level security;
alter table public.payments enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.rsvp_submissions enable row level security;
alter table public.rsvp_guests enable row level security;
alter table public.rsvp_answers enable row level security;

create policy "Profiles are self-readable" on public.profiles for select using (id = auth.uid());
create policy "Profiles are self-updatable" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can read events" on public.events for select using (owner_id = auth.uid() or public.is_event_member(id) or status = 'published');
create policy "Authenticated users can create events" on public.events for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners can update events" on public.events for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Members can read memberships" on public.event_members for select using (public.is_event_member(event_id));
create policy "Owners can manage memberships" on public.event_members for all using (public.is_event_member(event_id)) with check (public.is_event_member(event_id));

create policy "Members can read versions" on public.event_versions for select using (public.is_event_member(event_id));
create policy "Members can create versions" on public.event_versions for insert to authenticated with check (public.is_event_member(event_id));

create policy "Published artifacts are public" on public.page_artifacts for select using (status = 'published' or public.is_event_member(event_id));
create policy "Members can manage artifacts" on public.page_artifacts for all using (public.is_event_member(event_id)) with check (public.is_event_member(event_id));

create policy "Published assets are public" on public.assets for select using (public.is_event_member(event_id) or exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));
create policy "Members can manage assets" on public.assets for all using (public.is_event_member(event_id)) with check (public.is_event_member(event_id));

create policy "Members can read domains" on public.domains for select using (public.is_event_member(event_id));
create policy "Members can manage domains" on public.domains for all using (public.is_event_member(event_id)) with check (public.is_event_member(event_id));

create policy "Members can read payments" on public.payments for select using (public.is_event_member(event_id));
create policy "Members can read jobs" on public.generation_jobs for select using (event_id is null or public.is_event_member(event_id));
create policy "Members can create jobs" on public.generation_jobs for insert to authenticated with check (event_id is null or public.is_event_member(event_id));

create policy "Members can read submissions" on public.rsvp_submissions for select using (public.is_event_member(event_id));
create policy "Public can RSVP to published open events" on public.rsvp_submissions for insert to anon, authenticated with check (
  exists (select 1 from public.events e where e.id = event_id and e.status = 'published' and e.rsvp_open = true)
);

create policy "Members can read guests" on public.rsvp_guests for select using (public.is_event_member(event_id));
create policy "Public can insert RSVP guests" on public.rsvp_guests for insert to anon, authenticated with check (
  exists (select 1 from public.events e where e.id = event_id and e.status = 'published' and e.rsvp_open = true)
);

create policy "Members can read answers" on public.rsvp_answers for select using (public.is_event_member(event_id));
create policy "Public can insert RSVP answers" on public.rsvp_answers for insert to anon, authenticated with check (
  exists (select 1 from public.events e where e.id = event_id and e.status = 'published' and e.rsvp_open = true)
);

create index events_slug_idx on public.events (slug);
create index domains_domain_idx on public.domains (domain);
create index rsvp_submissions_event_created_idx on public.rsvp_submissions (event_id, created_at desc);
create index page_artifacts_event_status_idx on public.page_artifacts (event_id, status, created_at desc);
create unique index rsvp_guests_submission_name_idx on public.rsvp_guests (submission_id, lower(name));
