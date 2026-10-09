-- S11 follow-up: reject reserved event slugs at the database level.
--
-- Event slugs are served at /<slug> and <slug>.<root domain>, so a slug such as
-- `login`, `admin` or `rsvp-website` would shadow an app route or impersonate an
-- official Eventloom host. The app already rejects these (src/lib/reserved-slugs.ts);
-- this is the backstop for any write path that bypasses the app.
--
-- A trigger rather than a CHECK constraint: Postgres re-checks CHECK constraints on
-- every UPDATE of a row, so a legacy event already holding a reserved slug could
-- never be saved or published again. The trigger only fires on INSERT and on a slug
-- change, so existing rows keep working until they are renamed.
-- Keep the list identical to RESERVED_SLUGS; src/lib/tests/reserved-slugs-migration.test.ts
-- parses the array between the markers and fails if they drift. Change it with a new
-- migration that replaces private.reject_reserved_event_slug().

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
      'opengraph-image', 'postmaster', 'preview', 'pricing', 'privacy',
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
