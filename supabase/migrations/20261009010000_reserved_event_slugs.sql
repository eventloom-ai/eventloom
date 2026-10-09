-- S11 follow-up: reject reserved event slugs at the database level.
--
-- Event slugs are served at /<slug> and <slug>.<root domain>, so a slug such as
-- `login`, `admin` or `rsvp-website` would shadow an app route or impersonate an
-- official Eventloom host. The app already rejects these (src/lib/reserved-slugs.ts),
-- but any write path that bypasses the app (SQL editor, a future RPC, the REST API
-- if grants ever regress) would not. This constraint is the backstop.
--
-- * The list is inlined rather than wrapped in a helper function: CHECK
--   constraints run with the inserting role's privileges, and default privileges
--   revoke EXECUTE on new functions from public/anon/authenticated
--   (20260722052756), so a function would need extra grants to be safe.
-- * It is added NOT VALID so that any existing row that already uses a reserved
--   slug does not block the migration; new inserts and updates are checked.
--   Caveat: Postgres re-checks CHECK constraints on EVERY update of a row, so a
--   legacy row that already holds a reserved slug can no longer be updated at
--   all (autosave, publish, status changes) until it is renamed. Before applying,
--   look for such rows and rename them first:
--     select id, slug, status from public.events
--     where not (slug <> all (<the list below>));
--   Once there are none, run:
--     alter table public.events validate constraint events_slug_not_reserved;
-- * Keep the list identical to RESERVED_SLUGS. src/lib/tests/reserved-slugs-migration.test.ts
--   parses the array between the markers below and fails if they drift; when the
--   list changes, add a new migration that drops and re-adds the constraint.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_slug_not_reserved' and conrelid = 'public.events'::regclass
  ) then
    alter table public.events add constraint events_slug_not_reserved check (slug <> all (array[
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
    ]::text[])) not valid;
  end if;
end
$$;

comment on constraint events_slug_not_reserved on public.events is
  'Mirrors RESERVED_SLUGS in src/lib/reserved-slugs.ts (kept in sync by a vitest test). Added NOT VALID; validate after checking existing rows.';
