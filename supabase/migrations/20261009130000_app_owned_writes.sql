-- Signed-in users kept broad write grants from the first schema, so anyone could call PostgREST with their own
-- JWT and skip every check the app makes: minting "running" generation jobs that the stale-job reaper refunds
-- (free AI credit), pointing published_version_id at an unvalidated version, flipping status/slug/rsvp_open, or
-- editing RSVP form definitions. Every legitimate write now goes through the service role in server routes after
-- they verify ownership (src/lib/agent/tools.ts writableClient, publish route), so these grants are revoked.
-- Read access (row-level-security scoped) is unchanged.

revoke insert, update, delete on table
  public.events,
  public.event_versions,
  public.event_members,
  public.event_settings,
  public.generation_jobs,
  public.builder_messages,
  public.assets,
  public.page_artifacts,
  public.payments,
  public.organizations,
  public.organization_members,
  public.invite_groups,
  public.invitees,
  public.rsvp_forms,
  public.rsvp_fields,
  public.rsvp_field_options
from authenticated, anon;

-- The legacy 'event-assets' storage bucket is unused (uploads go through the server to event-assets-private);
-- members could still write unprocessed files into it directly.
drop policy if exists "Event members can upload event assets" on storage.objects;
drop policy if exists "Event members can update event assets" on storage.objects;
drop policy if exists "Event members can delete event assets" on storage.objects;
