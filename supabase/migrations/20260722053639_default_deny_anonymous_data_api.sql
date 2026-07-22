-- Public pages are rendered from server-generated DTOs. Anonymous browsers do
-- not need direct PostgREST access to any application table or RPC.
do $$
declare row record;
begin
  for row in select schemaname, tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on table %I.%I from anon', row.schemaname, row.tablename);
  end loop;
  for row in select sequence_schema, sequence_name from information_schema.sequences where sequence_schema = 'public' loop
    execute format('revoke all on sequence %I.%I from anon', row.sequence_schema, row.sequence_name);
  end loop;
end $$;

revoke execute on all functions in schema public from anon;
