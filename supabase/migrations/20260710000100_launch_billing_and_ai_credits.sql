-- Launch billing and AI usage guardrails. All mutations are performed with the
-- service role from trusted route handlers; clients receive no write policy.

alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders add constraint orders_kind_check
  check (kind in ('event_site', 'event_launch', 'event_renewal', 'custom_domain', 'traffic_upgrade', 'upgrade', 'sms_pack', 'other'));

create table if not exists public.event_entitlements (
  event_id uuid primary key references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  launch_order_id uuid unique references public.orders(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'revoked')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_cents integer not null default 500 check (available_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_credit_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  order_id uuid unique references public.orders(id) on delete set null,
  delta_cents integer not null check (delta_cents <> 0),
  reason text not null check (reason in ('trial_grant', 'build', 'launch_bonus', 'admin_adjustment')),
  created_at timestamptz not null default now()
);

alter table public.event_entitlements enable row level security;
alter table public.ai_credit_accounts enable row level security;
alter table public.ai_credit_ledger enable row level security;

create policy "Users can read their AI credit account" on public.ai_credit_accounts
  for select using (user_id = auth.uid());
create policy "Users can read their AI credit ledger" on public.ai_credit_ledger
  for select using (user_id = auth.uid());
create policy "Event members can read entitlements" on public.event_entitlements
  for select using (public.is_event_member(event_id));

create index if not exists event_entitlements_active_idx on public.event_entitlements (status, expires_at);
create index if not exists ai_credit_ledger_user_created_idx on public.ai_credit_ledger (user_id, created_at desc);

create or replace function public.reserve_ai_build_credit(p_user_id uuid, p_event_id uuid, p_amount_cents integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if p_amount_cents <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  insert into public.ai_credit_accounts (user_id, available_cents)
  values (p_user_id, 500)
  on conflict (user_id) do nothing;

  update public.ai_credit_accounts
  set available_cents = available_cents - p_amount_cents, updated_at = now()
  where user_id = p_user_id and available_cents >= p_amount_cents
  returning available_cents into remaining;

  if remaining is null then
    return null;
  end if;

  insert into public.ai_credit_ledger (user_id, event_id, delta_cents, reason)
  values (p_user_id, p_event_id, -p_amount_cents, 'build');
  return remaining;
end;
$$;

create or replace function public.grant_launch_ai_credit(p_user_id uuid, p_order_id uuid, p_amount_cents integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.ai_credit_accounts (user_id, available_cents)
  values (p_user_id, 500)
  on conflict (user_id) do nothing;

  insert into public.ai_credit_ledger (user_id, order_id, delta_cents, reason)
  values (p_user_id, p_order_id, p_amount_cents, 'launch_bonus')
  on conflict (order_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    update public.ai_credit_accounts
    set available_cents = available_cents + p_amount_cents, updated_at = now()
    where user_id = p_user_id;
  end if;
  return inserted_count > 0;
end;
$$;

grant all on table public.event_entitlements to service_role;
grant all on table public.ai_credit_accounts to service_role;
grant all on table public.ai_credit_ledger to service_role;
grant select on table public.event_entitlements to authenticated;
grant select on table public.ai_credit_accounts to authenticated;
grant select on table public.ai_credit_ledger to authenticated;
grant execute on function public.reserve_ai_build_credit(uuid, uuid, integer) to service_role;
grant execute on function public.grant_launch_ai_credit(uuid, uuid, integer) to service_role;
