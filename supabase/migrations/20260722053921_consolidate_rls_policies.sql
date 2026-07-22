-- Split broad ALL policies into command-specific policies so each operation
-- evaluates one permissive rule. Public reads continue through server DTOs.
do $$
declare table_name text;
declare manage_name text;
declare read_name text;
begin
  for table_name, manage_name, read_name in values
    ('assets', 'Members can manage assets', 'Published assets are public'),
    ('domains', 'Members can manage domains', 'Members can read domains'),
    ('event_settings', 'Members can manage event settings', 'Members can read event settings'),
    ('invite_groups', 'Members can manage invite groups', 'Members can read invite groups'),
    ('invitees', 'Members can manage invitees', 'Members can read invitees'),
    ('page_artifacts', 'Members can manage artifacts', 'Published artifacts are public'),
    ('rsvp_fields', 'Members can manage RSVP fields', 'Members can read RSVP fields'),
    ('rsvp_forms', 'Members can manage RSVP forms', 'Members can read RSVP forms')
  loop
    execute format('drop policy if exists %I on public.%I', manage_name, table_name);
    execute format('drop policy if exists %I on public.%I', read_name, table_name);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_event_member(event_id))', 'Members read rows', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_event_member(event_id))', 'Members insert rows', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_event_member(event_id)) with check (private.is_event_member(event_id))', 'Members update rows', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_event_member(event_id))', 'Members delete rows', table_name);
  end loop;
end $$;

drop policy if exists "Owners can manage memberships" on public.event_members;
drop policy if exists "Members can read memberships" on public.event_members;
create policy "Members read memberships" on public.event_members for select to authenticated using (private.is_event_member(event_id));
create policy "Owners insert memberships" on public.event_members for insert to authenticated with check (private.is_event_owner(event_id));
create policy "Owners update memberships" on public.event_members for update to authenticated using (private.is_event_owner(event_id)) with check (private.is_event_owner(event_id));
create policy "Owners delete memberships" on public.event_members for delete to authenticated using (private.is_event_owner(event_id));

drop policy if exists "Owners can manage organization memberships" on public.organization_members;
drop policy if exists "Members can read organization memberships" on public.organization_members;
create policy "Members read organization memberships" on public.organization_members for select to authenticated using (private.is_organization_member(organization_id));
create policy "Owners insert organization memberships" on public.organization_members for insert to authenticated with check (private.is_organization_owner(organization_id));
create policy "Owners update organization memberships" on public.organization_members for update to authenticated using (private.is_organization_owner(organization_id)) with check (private.is_organization_owner(organization_id));
create policy "Owners delete organization memberships" on public.organization_members for delete to authenticated using (private.is_organization_owner(organization_id));

drop policy if exists "Members can manage RSVP field options" on public.rsvp_field_options;
drop policy if exists "Members can read RSVP field options" on public.rsvp_field_options;
create policy "Members read RSVP field options" on public.rsvp_field_options for select to authenticated using (exists (select 1 from public.rsvp_fields f where f.id = field_id and private.is_event_member(f.event_id)));
create policy "Members insert RSVP field options" on public.rsvp_field_options for insert to authenticated with check (exists (select 1 from public.rsvp_fields f where f.id = field_id and private.is_event_member(f.event_id)));
create policy "Members update RSVP field options" on public.rsvp_field_options for update to authenticated using (exists (select 1 from public.rsvp_fields f where f.id = field_id and private.is_event_member(f.event_id))) with check (exists (select 1 from public.rsvp_fields f where f.id = field_id and private.is_event_member(f.event_id)));
create policy "Members delete RSVP field options" on public.rsvp_field_options for delete to authenticated using (exists (select 1 from public.rsvp_fields f where f.id = field_id and private.is_event_member(f.event_id)));

drop policy if exists "Members can read events" on public.events;
drop policy if exists "Organization members can read events" on public.events;
create policy "Members read events" on public.events for select to authenticated using (
  owner_id = (select auth.uid()) or private.is_event_member(id)
  or (organization_id is not null and private.is_organization_member(organization_id))
);
drop policy if exists "Owners can update events" on public.events;
drop policy if exists "Organization owners can update events" on public.events;
create policy "Owners update events" on public.events for update to authenticated using (
  owner_id = (select auth.uid()) or (organization_id is not null and private.is_organization_owner(organization_id))
) with check (
  owner_id = (select auth.uid()) or (organization_id is not null and private.is_organization_owner(organization_id))
);
