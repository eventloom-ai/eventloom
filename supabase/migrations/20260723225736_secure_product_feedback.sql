-- Product feedback is accepted only by the server route. It is intentionally
-- unavailable to browser database clients, even for signed-in creators.
create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('bug', 'confusing', 'idea', 'praise')),
  rating smallint check (rating between 1 and 5),
  message text not null check (char_length(message) between 10 and 2000),
  page_path text not null check (page_path ~ '^/' and char_length(page_path) <= 240),
  ip_hash text,
  user_agent_class text not null default 'unknown',
  status text not null default 'new' check (status in ('new', 'reviewing', 'planned', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.product_feedback enable row level security;
revoke all on table public.product_feedback from public, anon, authenticated;
grant select, insert, update, delete on table public.product_feedback to service_role;

create index if not exists product_feedback_created_at_idx
  on public.product_feedback (created_at desc);
create index if not exists product_feedback_user_created_idx
  on public.product_feedback (user_id, created_at desc)
  where user_id is not null;
create index if not exists product_feedback_ip_created_idx
  on public.product_feedback (ip_hash, created_at desc)
  where ip_hash is not null;

comment on table public.product_feedback is
  'Privacy-minimized feedback submitted through the server-only feedback route.';
