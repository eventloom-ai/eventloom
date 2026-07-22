create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- Platform administrators are assigned operationally after identity and MFA
-- verification. Fresh environments must never bootstrap a hard-coded user.
