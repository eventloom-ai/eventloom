-- Durable, cross-instance rate limiting for app routes (src/lib/security/rate-limit.ts).
--
-- Vercel functions run on many short-lived instances, so an in-memory counter limits nothing.
-- Each allowed request is one row in private.rate_limit_hits; consume_rate_limit counts the
-- rows for (bucket, subject) inside a sliding window and records a new hit only when under the
-- limit. Denied attempts are not recorded, so hammering a limit does not extend the lockout.
--
-- Subjects are hashed by the app before they get here (HMAC of "user:<uuid>" or "ip:<address>"),
-- never raw IPs or user ids.
--
-- Concurrency: the count and the insert run under a transaction-scoped advisory lock keyed on
-- hash(bucket, subject). Two concurrent calls for the same key serialize on that lock, so the
-- second one counts the first one's row and N parallel requests can never all slip under the
-- limit. Calls for different keys never wait on each other (a 64-bit hash collision would only
-- serialize two unrelated keys, never miscount). Each PostgREST RPC is its own transaction,
-- so the lock is released as soon as the call returns.
--
-- Old rows are deleted by the daily maintenance cron (purge_rate_limit_hits), not on every call.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.rate_limit_hits (
  bucket text not null,
  subject_hash text not null,
  hit_at timestamptz not null default clock_timestamp()
);

-- Window lookups: equality on (bucket, subject_hash), range on hit_at.
create index if not exists rate_limit_hits_lookup_idx
  on private.rate_limit_hits (bucket, subject_hash, hit_at desc);
-- Daily purge of expired rows.
create index if not exists rate_limit_hits_hit_at_idx
  on private.rate_limit_hits (hit_at);

alter table private.rate_limit_hits enable row level security;
revoke all on table private.rate_limit_hits from public, anon, authenticated;
grant select, insert, delete on table private.rate_limit_hits to service_role;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_window_seconds integer,
  p_max integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_time timestamptz;
  window_start timestamptz;
  hits integer;
  unblocking_hit timestamptz;
  retry_after integer;
begin
  if p_bucket is null or p_bucket !~ '^[a-z0-9][a-z0-9_.:-]{0,63}$'
    or p_subject is null or length(p_subject) not between 1 and 200
    or p_window_seconds is null or p_window_seconds not between 1 and 86400
    or p_max is null or p_max not between 1 and 100000
  then
    raise exception 'invalid_rate_limit' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_bucket || chr(31) || p_subject, 0));

  -- Read the clock after the lock so a call that waited counts the hits recorded meanwhile.
  request_time := clock_timestamp();
  window_start := request_time - make_interval(secs => p_window_seconds);

  select count(*)::integer into hits
  from private.rate_limit_hits h
  where h.bucket = p_bucket and h.subject_hash = p_subject and h.hit_at > window_start;

  if hits >= p_max then
    -- One more request fits once (hits - p_max + 1) of the hits in the window have aged out,
    -- i.e. when the (hits - p_max + 1)-th oldest of them leaves the window.
    select h.hit_at into unblocking_hit
    from private.rate_limit_hits h
    where h.bucket = p_bucket and h.subject_hash = p_subject and h.hit_at > window_start
    order by h.hit_at
    offset hits - p_max
    limit 1;
    retry_after := greatest(1, ceil(extract(epoch from (unblocking_hit + make_interval(secs => p_window_seconds) - request_time)))::integer);
    return jsonb_build_object('allowed', false, 'remaining', 0, 'retry_after_seconds', retry_after);
  end if;

  insert into private.rate_limit_hits (bucket, subject_hash, hit_at) values (p_bucket, p_subject, request_time);
  return jsonb_build_object('allowed', true, 'remaining', p_max - hits - 1, 'retry_after_seconds', 0);
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

-- Windows are capped at one day, so anything older than two days can never be counted again.
create or replace function public.purge_rate_limit_hits()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from private.rate_limit_hits h where h.hit_at < now() - interval '2 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_rate_limit_hits() from public, anon, authenticated;
grant execute on function public.purge_rate_limit_hits() to service_role;
