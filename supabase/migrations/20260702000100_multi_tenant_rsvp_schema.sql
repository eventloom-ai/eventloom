-- Multi-tenant RSVP platform expansion.
--
-- This migration is intentionally additive and data-preserving:
-- - no existing tables or columns are dropped
-- - existing events are backfilled into organizations where possible
-- - existing RSVP submissions and guests remain untouched
-- - legacy event creation that only supplies owner_id keeps working

create extension if not exists "pgcrypto" with schema extensions;

create table if not exists public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 63),
  billing_email text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'business', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.events
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists event_type text,
  add column if not exists timezone text not null default 'America/Toronto',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists rsvp_deadline_at timestamptz,
  add column if not exists capacity integer check (capacity is null or capacity > 0),
  add column if not exists public_rsvp_enabled boolean not null default true,
  add column if not exists published_at timestamptz;

create table if not exists public.event_settings (
  event_id uuid primary key references public.events(id) on delete cascade,
  locale text not null default 'en',
  supported_locales text[] not null default array['en']::text[],
  invite_mode text not null default 'open' check (invite_mode in ('open', 'invite_only', 'hybrid')),
  require_invite_code boolean not null default false,
  allow_plus_ones boolean not null default true,
  max_party_size integer not null default 50 check (max_party_size between 0 and 500),
  collect_email boolean not null default true,
  collect_phone boolean not null default false,
  rsvp_success_message text,
  rsvp_closed_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvp_forms (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null default 'Default RSVP form',
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvp_fields (
  id uuid primary key default extensions.gen_random_uuid(),
  form_id uuid not null references public.rsvp_forms(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  field_key text not null check (field_key ~ '^[a-z0-9_]+$' and length(field_key) between 1 and 64),
  label text not null check (length(btrim(label)) between 1 and 160),
  field_type text not null check (field_type in ('text', 'textarea', 'email', 'phone', 'number', 'select', 'multiselect', 'boolean', 'date')),
  required boolean not null default false,
  display_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (form_id, field_key)
);

create table if not exists public.rsvp_field_options (
  id uuid primary key default extensions.gen_random_uuid(),
  field_id uuid not null references public.rsvp_fields(id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 160),
  value text not null check (length(btrim(value)) between 1 and 160),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (field_id, value)
);

create table if not exists public.invite_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  invite_code text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'revoked', 'archived')),
  max_party_size integer not null default 1 check (max_party_size between 0 and 500),
  language text not null default 'en',
  group_label text,
  tags text[] not null default '{}'::text[],
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, invite_code)
);

create table if not exists public.invitees (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  invite_group_id uuid not null references public.invite_groups(id) on delete cascade,
  first_name text not null check (length(btrim(first_name)) between 1 and 80),
  last_name text,
  email text,
  phone text,
  gender text check (gender is null or gender in ('male', 'female', 'other', 'unknown')),
  age_group text check (age_group is null or age_group in ('adult', 'child', 'infant', 'unknown')),
  role text not null default 'guest' check (role in ('primary', 'guest', 'plus_one')),
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rsvp_submissions
  add column if not exists invite_group_id uuid references public.invite_groups(id) on delete set null,
  add column if not exists form_id uuid references public.rsvp_forms(id) on delete set null,
  add column if not exists status text not null default 'submitted' check (status in ('submitted', 'updated', 'cancelled', 'deleted')),
  add column if not exists source text not null default 'public_site' check (source in ('public_site', 'invite_link', 'admin_entry', 'import')),
  add column if not exists ip_hash text,
  add column if not exists user_agent text;

alter table public.rsvp_guests
  add column if not exists invitee_id uuid references public.invitees(id) on delete set null,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists gender text check (gender is null or gender in ('male', 'female', 'other', 'unknown')),
  add column if not exists meal_choice text,
  add column if not exists notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.rsvp_answers
  add column if not exists field_id uuid references public.rsvp_fields(id) on delete set null,
  add column if not exists value_json jsonb;

create table if not exists public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  kind text not null default 'event_site' check (kind in ('event_site', 'custom_domain', 'upgrade', 'sms_pack', 'other')),
  amount_total integer not null default 0 check (amount_total >= 0),
  currency text not null default 'usd',
  provider text not null default 'stripe',
  provider_reference text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists provider text not null default 'stripe',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'user' check (actor_type in ('user', 'guest', 'system', 'admin')),
  action text not null check (length(btrim(action)) between 1 and 120),
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.organizations (name, slug, billing_email, metadata)
select
  coalesce(nullif(p.full_name, ''), split_part(coalesce(p.email, ''), '@', 1), 'Eventloom user') || '''s Workspace',
  'user-' || left(replace(e.owner_id::text, '-', ''), 24),
  p.email,
  jsonb_build_object('source', 'migration_20260702000100', 'owner_id', e.owner_id)
from (select distinct owner_id from public.events where owner_id is not null) e
left join public.profiles p on p.id = e.owner_id
on conflict (slug) do nothing;

insert into public.organization_members (organization_id, user_id, role)
select o.id, (o.metadata ->> 'owner_id')::uuid, 'owner'
from public.organizations o
where o.metadata ->> 'source' = 'migration_20260702000100'
  and o.metadata ? 'owner_id'
on conflict (organization_id, user_id) do nothing;

insert into public.organizations (name, slug, metadata)
select 'Imported Events', 'imported-events', jsonb_build_object('source', 'migration_20260702000100', 'reason', 'events_without_owner')
where exists (select 1 from public.events where owner_id is null)
on conflict (slug) do nothing;

update public.events e
set organization_id = o.id
from public.organizations o
where e.organization_id is null
  and e.owner_id is not null
  and o.slug = 'user-' || left(replace(e.owner_id::text, '-', ''), 24);

update public.events e
set organization_id = o.id
from public.organizations o
where e.organization_id is null
  and e.owner_id is null
  and o.slug = 'imported-events';

update public.events
set
  event_type = coalesce(event_type, nullif(config ->> 'eventType', '')),
  rsvp_deadline_at = coalesce(
    rsvp_deadline_at,
    case
      when config ? 'rsvpDeadline' and (config ->> 'rsvpDeadline') ~ '^\d{4}-\d{2}-\d{2}'
      then (config ->> 'rsvpDeadline')::timestamptz
      else null
    end
  ),
  published_at = case
    when published_at is null and status = 'published' then updated_at
    else published_at
  end;

insert into public.event_settings (event_id, locale, supported_locales, invite_mode, require_invite_code, max_party_size, collect_email, collect_phone)
select
  e.id,
  'en',
  array['en']::text[],
  'open',
  false,
  50,
  true,
  false
from public.events e
on conflict (event_id) do nothing;

insert into public.rsvp_forms (event_id, name, status)
select e.id, 'Default RSVP form', 'active'
from public.events e
where not exists (select 1 from public.rsvp_forms f where f.event_id = e.id and f.status = 'active');

insert into public.rsvp_fields (form_id, event_id, field_key, label, field_type, required, display_order)
select f.id, f.event_id, field.field_key, field.label, field.field_type, field.required, field.display_order
from public.rsvp_forms f
cross join (
  values
    ('first_name', 'First name', 'text', true, 10),
    ('last_name', 'Last name', 'text', true, 20),
    ('attendance', 'Will you attend?', 'boolean', true, 30),
    ('party_size', 'Party size', 'number', true, 40),
    ('guest_names', 'Guest names', 'textarea', false, 50),
    ('note', 'Note', 'textarea', false, 60)
) as field(field_key, label, field_type, required, display_order)
where f.status = 'active'
on conflict (form_id, field_key) do nothing;

update public.rsvp_submissions s
set form_id = f.id
from public.rsvp_forms f
where s.form_id is null
  and f.event_id = s.event_id
  and f.status = 'active';

update public.rsvp_guests
set
  first_name = coalesce(first_name, nullif(split_part(btrim(name), ' ', 1), '')),
  last_name = coalesce(last_name, nullif(btrim(substr(btrim(name), length(split_part(btrim(name), ' ', 1)) + 1)), ''));

update public.payments p
set organization_id = e.organization_id
from public.events e
where p.organization_id is null
  and p.event_id = e.id;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_organization_owner(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.organization_has_no_members(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
  );
$$;

create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    left join public.event_members m on m.event_id = e.id and m.user_id = auth.uid()
    left join public.organization_members om on om.organization_id = e.organization_id and om.user_id = auth.uid()
    where e.id = p_event_id
      and (e.owner_id = auth.uid() or m.user_id is not null or om.user_id is not null)
  );
$$;

create or replace function public.is_event_owner(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    left join public.event_members m
      on m.event_id = e.id
      and m.user_id = auth.uid()
      and m.role = 'owner'
    left join public.organization_members om
      on om.organization_id = e.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    where e.id = p_event_id
      and (e.owner_id = auth.uid() or m.user_id is not null or om.user_id is not null)
  );
$$;

create or replace function public.ensure_event_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_organization_id uuid;
  generated_slug text;
begin
  if new.organization_id is not null or new.owner_id is null then
    return new;
  end if;

  select organization_id
  into selected_organization_id
  from public.organization_members
  where user_id = new.owner_id
    and role in ('owner', 'admin')
  order by created_at asc
  limit 1;

  if selected_organization_id is null then
    generated_slug := 'user-' || left(replace(new.owner_id::text, '-', ''), 24);

    insert into public.organizations (name, slug, metadata)
    values ('Eventloom Workspace', generated_slug, jsonb_build_object('source', 'ensure_event_organization', 'owner_id', new.owner_id))
    on conflict (slug) do update set updated_at = now()
    returning id into selected_organization_id;

    insert into public.organization_members (organization_id, user_id, role)
    values (selected_organization_id, new.owner_id, 'owner')
    on conflict (organization_id, user_id) do nothing;
  end if;

  new.organization_id := selected_organization_id;
  return new;
end;
$$;

drop trigger if exists ensure_event_organization_before_insert on public.events;
create trigger ensure_event_organization_before_insert
  before insert on public.events
  for each row
  execute function public.ensure_event_organization();

create or replace function public.ensure_event_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_form_id uuid;
begin
  insert into public.event_settings (event_id)
  values (new.id)
  on conflict (event_id) do nothing;

  insert into public.rsvp_forms (event_id, name, status)
  values (new.id, 'Default RSVP form', 'active')
  returning id into default_form_id;

  insert into public.rsvp_fields (form_id, event_id, field_key, label, field_type, required, display_order)
  values
    (default_form_id, new.id, 'first_name', 'First name', 'text', true, 10),
    (default_form_id, new.id, 'last_name', 'Last name', 'text', true, 20),
    (default_form_id, new.id, 'attendance', 'Will you attend?', 'boolean', true, 30),
    (default_form_id, new.id, 'party_size', 'Party size', 'number', true, 40),
    (default_form_id, new.id, 'guest_names', 'Guest names', 'textarea', false, 50),
    (default_form_id, new.id, 'note', 'Note', 'textarea', false, 60)
  on conflict (form_id, field_key) do nothing;

  return new;
end;
$$;

drop trigger if exists ensure_event_defaults_after_insert on public.events;
create trigger ensure_event_defaults_after_insert
  after insert on public.events
  for each row
  execute function public.ensure_event_defaults();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.event_settings enable row level security;
alter table public.rsvp_forms enable row level security;
alter table public.rsvp_fields enable row level security;
alter table public.rsvp_field_options enable row level security;
alter table public.invite_groups enable row level security;
alter table public.invitees enable row level security;
alter table public.orders enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations" on public.organizations
  for select
  using (public.is_organization_member(id));

drop policy if exists "Authenticated users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations" on public.organizations
  for insert
  to authenticated
  with check (true);

drop policy if exists "Owners can update organizations" on public.organizations;
create policy "Owners can update organizations" on public.organizations
  for update
  using (public.is_organization_owner(id))
  with check (public.is_organization_owner(id));

drop policy if exists "Members can read organization memberships" on public.organization_members;
create policy "Members can read organization memberships" on public.organization_members
  for select
  using (public.is_organization_member(organization_id));

drop policy if exists "Users can create initial organization ownership" on public.organization_members;
create policy "Users can create initial organization ownership" on public.organization_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and public.organization_has_no_members(organization_id)
  );

drop policy if exists "Owners can manage organization memberships" on public.organization_members;
create policy "Owners can manage organization memberships" on public.organization_members
  for all
  using (public.is_organization_owner(organization_id))
  with check (public.is_organization_owner(organization_id));

drop policy if exists "Owners can manage memberships" on public.event_members;
create policy "Owners can manage memberships" on public.event_members
  for all
  using (public.is_event_owner(event_id))
  with check (public.is_event_owner(event_id));

drop policy if exists "Organization members can read events" on public.events;
create policy "Organization members can read events" on public.events
  for select
  using (organization_id is not null and public.is_organization_member(organization_id));

drop policy if exists "Organization owners can update events" on public.events;
create policy "Organization owners can update events" on public.events
  for update
  using (organization_id is not null and public.is_organization_owner(organization_id))
  with check (organization_id is not null and public.is_organization_owner(organization_id));

drop policy if exists "Members can read event settings" on public.event_settings;
create policy "Members can read event settings" on public.event_settings
  for select
  using (public.is_event_member(event_id));

drop policy if exists "Members can manage event settings" on public.event_settings;
create policy "Members can manage event settings" on public.event_settings
  for all
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

drop policy if exists "Members can read RSVP forms" on public.rsvp_forms;
create policy "Members can read RSVP forms" on public.rsvp_forms
  for select
  using (public.is_event_member(event_id));

drop policy if exists "Members can manage RSVP forms" on public.rsvp_forms;
create policy "Members can manage RSVP forms" on public.rsvp_forms
  for all
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

drop policy if exists "Members can read RSVP fields" on public.rsvp_fields;
create policy "Members can read RSVP fields" on public.rsvp_fields
  for select
  using (public.is_event_member(event_id));

drop policy if exists "Members can manage RSVP fields" on public.rsvp_fields;
create policy "Members can manage RSVP fields" on public.rsvp_fields
  for all
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

drop policy if exists "Members can read RSVP field options" on public.rsvp_field_options;
create policy "Members can read RSVP field options" on public.rsvp_field_options
  for select
  using (
    exists (
      select 1
      from public.rsvp_fields f
      where f.id = field_id
        and public.is_event_member(f.event_id)
    )
  );

drop policy if exists "Members can manage RSVP field options" on public.rsvp_field_options;
create policy "Members can manage RSVP field options" on public.rsvp_field_options
  for all
  using (
    exists (
      select 1
      from public.rsvp_fields f
      where f.id = field_id
        and public.is_event_member(f.event_id)
    )
  )
  with check (
    exists (
      select 1
      from public.rsvp_fields f
      where f.id = field_id
        and public.is_event_member(f.event_id)
    )
  );

drop policy if exists "Members can read invite groups" on public.invite_groups;
create policy "Members can read invite groups" on public.invite_groups
  for select
  using (public.is_event_member(event_id));

drop policy if exists "Members can manage invite groups" on public.invite_groups;
create policy "Members can manage invite groups" on public.invite_groups
  for all
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

drop policy if exists "Members can read invitees" on public.invitees;
create policy "Members can read invitees" on public.invitees
  for select
  using (public.is_event_member(event_id));

drop policy if exists "Members can manage invitees" on public.invitees;
create policy "Members can manage invitees" on public.invitees
  for all
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

drop policy if exists "Members can read orders" on public.orders;
create policy "Members can read orders" on public.orders
  for select
  using (
    (organization_id is not null and public.is_organization_member(organization_id))
    or (event_id is not null and public.is_event_member(event_id))
  );

drop policy if exists "Members can read audit events" on public.audit_events;
create policy "Members can read audit events" on public.audit_events
  for select
  using (
    (organization_id is not null and public.is_organization_member(organization_id))
    or (event_id is not null and public.is_event_member(event_id))
  );

create index if not exists organizations_slug_idx on public.organizations (slug);
create index if not exists organization_members_user_idx on public.organization_members (user_id, organization_id);
create index if not exists events_organization_status_idx on public.events (organization_id, status, created_at desc);
create index if not exists events_rsvp_deadline_idx on public.events (rsvp_deadline_at);
create index if not exists rsvp_forms_event_status_idx on public.rsvp_forms (event_id, status);
create index if not exists rsvp_fields_form_order_idx on public.rsvp_fields (form_id, display_order);
create index if not exists invite_groups_event_status_idx on public.invite_groups (event_id, status);
create index if not exists invite_groups_invite_code_idx on public.invite_groups (invite_code);
create index if not exists invitees_event_group_idx on public.invitees (event_id, invite_group_id);
create index if not exists rsvp_submissions_invite_group_idx on public.rsvp_submissions (invite_group_id, created_at desc);
create index if not exists rsvp_submissions_status_idx on public.rsvp_submissions (event_id, status, created_at desc);
create index if not exists rsvp_guests_invitee_idx on public.rsvp_guests (invitee_id);
create index if not exists orders_organization_status_idx on public.orders (organization_id, status, created_at desc);
create index if not exists orders_event_idx on public.orders (event_id, created_at desc);
create index if not exists audit_events_org_created_idx on public.audit_events (organization_id, created_at desc);
create index if not exists audit_events_event_created_idx on public.audit_events (event_id, created_at desc);

grant all on table public.organizations to service_role;
grant select, insert, update on table public.organizations to authenticated;

grant all on table public.organization_members to service_role;
grant select, insert, update, delete on table public.organization_members to authenticated;

grant all on table public.event_settings to service_role;
grant select, insert, update, delete on table public.event_settings to authenticated;

grant all on table public.rsvp_forms to service_role;
grant select, insert, update, delete on table public.rsvp_forms to authenticated;

grant all on table public.rsvp_fields to service_role;
grant select, insert, update, delete on table public.rsvp_fields to authenticated;

grant all on table public.rsvp_field_options to service_role;
grant select, insert, update, delete on table public.rsvp_field_options to authenticated;

grant all on table public.invite_groups to service_role;
grant select, insert, update, delete on table public.invite_groups to authenticated;

grant all on table public.invitees to service_role;
grant select, insert, update, delete on table public.invitees to authenticated;

grant all on table public.orders to service_role;
grant select on table public.orders to authenticated;

grant all on table public.audit_events to service_role;
grant select on table public.audit_events to authenticated;

grant execute on function public.is_organization_member(uuid) to anon, authenticated, service_role;
grant execute on function public.is_organization_owner(uuid) to anon, authenticated, service_role;
grant execute on function public.organization_has_no_members(uuid) to authenticated, service_role;
grant execute on function public.is_event_member(uuid) to anon, authenticated, service_role;
grant execute on function public.is_event_owner(uuid) to anon, authenticated, service_role;
grant execute on function public.ensure_event_organization() to service_role;
grant execute on function public.ensure_event_defaults() to service_role;
