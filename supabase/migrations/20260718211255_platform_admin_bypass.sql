create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- This table is intentionally service-role only. Platform admins retain the
-- normal tenant boundaries; this flag only bypasses commercial gates.
insert into public.platform_admins (user_id)
values ('aef4bcd8-f4ed-4327-9359-af12108f742c')
on conflict (user_id) do nothing;
