-- Keep the legacy server-only limiter usable after its backing table moved out
-- of the exposed schema. Browser roles remain unable to execute the function.
create or replace function public.consume_rsvp_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_max_requests integer,
  p_block_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_limit private.legacy_rsvp_rate_limits%rowtype;
  request_time timestamptz := now();
  next_count integer;
begin
  insert into private.legacy_rsvp_rate_limits (bucket, window_start, request_count)
  values (p_bucket, request_time, 0)
  on conflict (bucket) do nothing;

  select limits.*
  into current_limit
  from private.legacy_rsvp_rate_limits as limits
  where limits.bucket = p_bucket
  for update;

  if current_limit.blocked_until is not null and current_limit.blocked_until > request_time then
    return false;
  end if;

  if current_limit.window_start <= request_time - make_interval(secs => p_window_seconds) then
    update private.legacy_rsvp_rate_limits as limits
    set window_start = request_time,
        request_count = 1,
        blocked_until = null
    where limits.bucket = p_bucket;
    return true;
  end if;

  next_count := current_limit.request_count + 1;

  update private.legacy_rsvp_rate_limits as limits
  set request_count = next_count,
      blocked_until = case
        when next_count > p_max_requests then request_time + make_interval(secs => p_block_seconds)
        else null
      end
  where limits.bucket = p_bucket;

  return next_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_rsvp_rate_limit(text, integer, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_rsvp_rate_limit(text, integer, integer, integer)
to service_role;

-- Qualify rate-limit columns and avoid colliding with the function's request
-- timestamp variable. This keeps RSVP validation and writes atomic.
create or replace function public.submit_public_rsvp(
  p_event_id uuid,
  p_idempotency_key uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_is_attending boolean,
  p_party_size integer,
  p_guest_names text[],
  p_answers jsonb,
  p_ip_hash text,
  p_user_agent_class text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_form_id uuid;
  submission_id uuid;
  request_time timestamptz := now();
  guest_name text;
begin
  if p_idempotency_key is null or p_event_id is null then raise exception 'invalid_request'; end if;
  select s.id into submission_id from public.rsvp_submissions s
    where s.event_id = p_event_id and s.idempotency_key = p_idempotency_key;
  if submission_id is not null then return submission_id; end if;

  if length(btrim(p_first_name)) not between 1 and 80
    or length(btrim(p_last_name)) not between 1 and 80
    or p_party_size not between 0 and 50
    or (not p_is_attending and (p_party_size <> 0 or cardinality(p_guest_names) <> 0))
    or (p_is_attending and p_party_size < 1)
    or cardinality(p_guest_names) > 50
  then raise exception 'invalid_request'; end if;

  select f.id into active_form_id
  from public.events e
  join public.event_entitlements en on en.event_id = e.id
  join public.rsvp_forms f on f.event_id = e.id and f.status = 'active'
  where e.id = p_event_id
    and e.status = 'published'
    and e.rsvp_open = true
    and e.public_rsvp_enabled = true
    and (e.rsvp_deadline_at is null or e.rsvp_deadline_at > request_time)
    and en.status = 'active'
    and en.expires_at > request_time
  order by f.updated_at desc
  limit 1
  for update of e;
  if active_form_id is null then raise exception 'rsvp_unavailable'; end if;

  if p_ip_hash is not null then
    delete from private.rsvp_rate_limits as limits
    where limits.requested_at < now() - interval '30 days';
    if (
      select count(*)
      from private.rsvp_rate_limits as limits
      where limits.event_id = p_event_id
        and limits.ip_hash = p_ip_hash
        and limits.requested_at > now() - interval '10 minutes'
    ) >= 10 then
      raise exception 'rate_limit';
    end if;
    insert into private.rsvp_rate_limits(event_id, ip_hash) values (p_event_id, p_ip_hash);
  end if;

  insert into public.rsvp_submissions(event_id, form_id, idempotency_key, first_name, last_name, email, phone, is_attending, party_size, answers, ip_hash, user_agent)
  values (p_event_id, active_form_id, p_idempotency_key, btrim(p_first_name), btrim(p_last_name), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''), p_is_attending, p_party_size, coalesce(p_answers, '{}'::jsonb), p_ip_hash, left(coalesce(p_user_agent_class, 'unknown'), 160))
  returning id into submission_id;

  foreach guest_name in array coalesce(p_guest_names, '{}'::text[]) loop
    if length(btrim(guest_name)) not between 1 and 160 then raise exception 'invalid_request'; end if;
    insert into public.rsvp_guests(submission_id, event_id, name) values (submission_id, p_event_id, btrim(guest_name));
  end loop;

  insert into public.rsvp_answers(submission_id, event_id, field_id, field_key, value, value_json)
  select submission_id, p_event_id, f.id, a.key, left(a.value, 500), to_jsonb(left(a.value, 500))
  from jsonb_each_text(coalesce(p_answers, '{}'::jsonb)) a
  join public.rsvp_fields f on f.form_id = active_form_id and f.field_key = a.key;

  insert into public.audit_events(event_id, actor_type, action, target_type, target_id, metadata)
  values (p_event_id, 'guest', 'rsvp.submitted', 'rsvp_submission', submission_id, jsonb_build_object('attending', p_is_attending, 'party_size', p_party_size));
  return submission_id;
end;
$$;

revoke all on function public.submit_public_rsvp(uuid, uuid, text, text, text, text, boolean, integer, text[], jsonb, text, text)
from public, anon, authenticated;
grant execute on function public.submit_public_rsvp(uuid, uuid, text, text, text, text, boolean, integer, text[], jsonb, text, text)
to service_role;
