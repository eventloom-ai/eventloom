-- Reserve `report` for the public "Report this page" form (/report). Same function and trigger as
-- 20261009010000_reserved_event_slugs with `report` added; keep the list identical to RESERVED_SLUGS
-- (src/lib/tests/reserved-slugs-migration.test.ts checks the newest migration that carries the markers).

create or replace function private.reject_reserved_event_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.slug is not distinct from old.slug then return new; end if;
  if new.slug = any (array[
      -- reserved-slugs:start
      'about', 'abuse', 'account', 'admin', 'api', 'app', 'assets', 'auth', 'billing',
      'birthday-event-website', 'blog', 'cdn', 'compare', 'contact', 'dashboard',
      'demo-wedding', 'design-preview', 'dev', 'docs', 'email', 'event-website-builder',
      'eventloom', 'events', 'favicon', 'ftp', 'guides', 'help', 'home', 'hostmaster', 'icon',
      'ip', 'legal', 'llms', 'login', 'logout', 'mail', 'new', 'ns1', 'ns2', 'online-rsvp',
      'opengraph-image', 'postmaster', 'preview', 'pricing', 'privacy', 'report',
      'private-event-website', 'robots', 'root', 'rsvp-website', 'security', 'settings',
      'signup', 'sitemap', 'sites', 'smtp', 'staging', 'static', 'status', 'studio',
      'support', 'templates', 'terms', 'webmaster', 'wedding-rsvp-website', 'www'
      -- reserved-slugs:end
    ]::text[]) then
    raise exception 'slug_reserved' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_reserved_event_slug() from public, anon, authenticated;

drop trigger if exists events_reject_reserved_slug on public.events;
create trigger events_reject_reserved_slug
  before insert or update of slug on public.events
  for each row
  execute function private.reject_reserved_event_slug();
