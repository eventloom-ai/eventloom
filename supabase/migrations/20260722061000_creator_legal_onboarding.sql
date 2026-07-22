alter table public.profiles
  add column if not exists age_18_confirmed_at timestamptz,
  add column if not exists legal_version text;

insert into public.legal_documents(document_key, version, title, content_sha256, status)
values ('acceptable-use', '2026-07-22-beta', 'Acceptable Use Policy', encode(extensions.digest('acceptable-use:2026-07-22-beta', 'sha256'), 'hex'), 'draft')
on conflict(document_key, version) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare accepted_version text := nullif(new.raw_user_meta_data ->> 'legal_version', '');
begin
  insert into public.profiles (id, email, full_name, age_18_confirmed_at, legal_version)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when new.raw_user_meta_data ->> 'age_18_confirmed' = 'true' then now() else null end,
    accepted_version
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    age_18_confirmed_at = coalesce(public.profiles.age_18_confirmed_at, excluded.age_18_confirmed_at),
    legal_version = coalesce(excluded.legal_version, public.profiles.legal_version);

  if accepted_version is not null and new.raw_user_meta_data ->> 'age_18_confirmed' = 'true' then
    insert into public.legal_acceptances(document_id, user_id, user_agent_class)
    select d.id, new.id, 'signup'
    from public.legal_documents d
    where d.version = accepted_version
      and d.status = 'active'
      and d.document_key in ('terms', 'privacy', 'acceptable-use');
  end if;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
