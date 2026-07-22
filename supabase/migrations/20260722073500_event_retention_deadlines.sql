create or replace function public.set_event_retention_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.event_ends_at := coalesce(new.event_ends_at, new.ends_at);
  new.ends_at := coalesce(new.ends_at, new.event_ends_at);
  if new.event_ends_at is not null and new.legal_hold = false then
    new.rsvp_purge_at := new.event_ends_at + interval '90 days';
  end if;
  return new;
end;
$$;
revoke all on function public.set_event_retention_deadline() from public, anon, authenticated;
grant execute on function public.set_event_retention_deadline() to service_role;
drop trigger if exists events_set_retention_deadline on public.events;
create trigger events_set_retention_deadline before insert or update of ends_at, event_ends_at, legal_hold on public.events
for each row execute function public.set_event_retention_deadline();

update public.events set event_ends_at = coalesce(event_ends_at, ends_at), rsvp_purge_at = coalesce(event_ends_at, ends_at) + interval '90 days'
where coalesce(event_ends_at, ends_at) is not null and legal_hold = false;
