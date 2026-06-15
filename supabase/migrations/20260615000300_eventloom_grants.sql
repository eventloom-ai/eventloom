-- Eventloom tables were created without role grants on the shared Sila project.
grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on table public.profiles to service_role;
grant select, update on table public.profiles to authenticated;

grant all on table public.events to service_role;
grant select, insert, update, delete on table public.events to authenticated;

grant all on table public.event_members to service_role;
grant select, insert, update, delete on table public.event_members to authenticated;

grant all on table public.event_versions to service_role;
grant select, insert on table public.event_versions to authenticated;

grant all on table public.page_artifacts to service_role;
grant select, insert, update, delete on table public.page_artifacts to authenticated;
grant select on table public.page_artifacts to anon;

grant all on table public.assets to service_role;
grant select, insert, update, delete on table public.assets to authenticated;
grant select on table public.assets to anon;

grant all on table public.domains to service_role;
grant select, insert, update, delete on table public.domains to authenticated;

grant all on table public.payments to service_role;
grant select, insert, update on table public.payments to authenticated;

grant all on table public.generation_jobs to service_role;
grant select, insert, update on table public.generation_jobs to authenticated;

grant all on table public.rsvp_submissions to service_role;
grant select on table public.rsvp_submissions to authenticated;
grant insert on table public.rsvp_submissions to anon, authenticated;

grant all on table public.rsvp_guests to service_role;
grant select on table public.rsvp_guests to authenticated;
grant insert on table public.rsvp_guests to anon, authenticated;

grant all on table public.rsvp_answers to service_role;
grant select on table public.rsvp_answers to authenticated;
grant insert on table public.rsvp_answers to anon, authenticated;

grant execute on function public.is_event_member(uuid) to anon, authenticated, service_role;
grant execute on function public.handle_new_user() to service_role;
