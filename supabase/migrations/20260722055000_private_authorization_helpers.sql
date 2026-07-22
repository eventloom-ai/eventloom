-- RLS helpers are needed by authenticated queries but should not be exposed as
-- REST RPCs. Moving them to a non-exposed schema preserves policy behavior.
grant usage on schema private to authenticated;
alter function public.is_event_member(uuid) set schema private;
alter function public.is_event_owner(uuid) set schema private;
alter function public.is_organization_member(uuid) set schema private;
alter function public.is_organization_owner(uuid) set schema private;
grant execute on function private.is_event_member(uuid) to authenticated, service_role;
grant execute on function private.is_event_owner(uuid) to authenticated, service_role;
grant execute on function private.is_organization_member(uuid) to authenticated, service_role;
grant execute on function private.is_organization_owner(uuid) to authenticated, service_role;

-- Organization creation crosses two tables and is only called from the
-- authenticated server route using the service role.
drop function if exists public.create_organization(text, text);
create function public.create_organization(p_name text, p_slug text, p_actor uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare created_id uuid;
begin
  if p_actor is null or not exists (select 1 from auth.users where id = p_actor) then
    raise exception 'authentication_required';
  end if;
  if length(btrim(p_name)) not between 1 and 120
    or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(p_slug) not between 3 and 63 then
    raise exception 'invalid_organization';
  end if;
  insert into public.organizations(name, slug) values (btrim(p_name), p_slug) returning id into created_id;
  insert into public.organization_members(organization_id, user_id, role) values (created_id, p_actor, 'owner');
  return created_id;
end;
$$;
revoke all on function public.create_organization(text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_organization(text, text, uuid) to service_role;
