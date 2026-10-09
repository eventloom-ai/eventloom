-- U2: publishing must go through the app (payment or admin entitlement, then the publish-time safety check).
-- 20261009130000 revoked insert/update/delete on public.events from anon/authenticated, but the old write
-- policies were left behind, so a single re-grant (dashboard click, `grant all`, a recreated table picking up
-- default privileges) would let an owner flip status / published_version_id over the Data API again.
-- Drop the dead write policies (RLS then denies browser writes even with a grant) and guard the publish columns
-- with a trigger like the suspension one. Server routes use the service role and SECURITY DEFINER RPCs run as
-- their owner, so neither is affected.

drop policy if exists "Owners update events" on public.events;
drop policy if exists "Authenticated users can create events" on public.events;

create or replace function private.protect_event_publish_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'INSERT' then
    if new.status is distinct from 'draft' or new.published_version_id is not null or new.published_at is not null or new.rsvp_open then
      raise exception 'publish_server_only' using errcode = '42501';
    end if;
  elsif new.status is distinct from old.status
    or new.published_version_id is distinct from old.published_version_id
    or new.published_at is distinct from old.published_at
    or new.rsvp_open is distinct from old.rsvp_open
  then
    raise exception 'publish_server_only' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_event_publish_state() from public, anon, authenticated;

drop trigger if exists events_protect_publish_state on public.events;
create trigger events_protect_publish_state
  before insert or update of status, published_version_id, published_at, rsvp_open on public.events
  for each row
  execute function private.protect_event_publish_state();
