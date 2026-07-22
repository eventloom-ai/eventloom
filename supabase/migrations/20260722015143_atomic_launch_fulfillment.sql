-- Fulfill a paid launch in one database transaction. Stripe can deliver the
-- same event more than once or concurrently, so every write is idempotent and
-- the entitlement term is only created on the first successful fulfillment.
create or replace function public.fulfill_event_launch(
  p_event_id uuid,
  p_order_id uuid,
  p_version_id uuid,
  p_stripe_session_id text,
  p_stripe_event_id text,
  p_payment_intent_id text,
  p_amount_total integer,
  p_currency text,
  p_ai_bonus_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  launch_order public.orders%rowtype;
  launch_event public.events%rowtype;
  existing_launch_order_id uuid;
  duplicate_fulfillment boolean := false;
  fulfilled_at timestamptz := now();
begin
  if nullif(btrim(p_stripe_session_id), '') is null
    or nullif(btrim(p_stripe_event_id), '') is null
    or p_amount_total <= 0
    or p_ai_bonus_cents <= 0
  then
    raise exception 'invalid_launch_fulfillment_input';
  end if;

  select *
  into launch_order
  from public.orders
  where id = p_order_id
    and event_id = p_event_id
  for update;

  if not found
    or launch_order.kind <> 'event_launch'
    or launch_order.provider <> 'stripe'
    or launch_order.status not in ('pending', 'paid')
    or launch_order.amount_total <> p_amount_total
    or lower(launch_order.currency) <> lower(p_currency)
    or launch_order.provider_reference <> p_stripe_session_id
    or launch_order.site_version_id <> p_version_id
  then
    raise exception 'invalid_launch_order';
  end if;

  -- Lock the event as well as the order. This serializes two different paid
  -- orders racing to activate the same event.
  select *
  into launch_event
  from public.events
  where id = p_event_id
  for update;

  if not found or launch_event.owner_id is null then
    raise exception 'launch_event_not_found';
  end if;

  perform 1
  from public.event_versions
  where id = p_version_id
    and event_id = p_event_id;

  if not found then
    raise exception 'launch_version_not_found';
  end if;

  select launch_order_id
  into existing_launch_order_id
  from public.event_entitlements
  where event_id = p_event_id;

  if existing_launch_order_id is not null and existing_launch_order_id <> p_order_id then
    raise exception 'event_already_launched_with_another_order';
  end if;

  duplicate_fulfillment :=
    launch_order.status = 'paid'
    and existing_launch_order_id = p_order_id
    and launch_event.status = 'published'
    and launch_event.published_version_id = p_version_id;

  update public.orders
  set status = 'paid', updated_at = fulfilled_at
  where id = p_order_id;

  insert into public.payments (
    event_id,
    stripe_session_id,
    order_id,
    status,
    amount_total,
    currency,
    provider,
    metadata
  )
  values (
    p_event_id,
    p_stripe_session_id,
    p_order_id,
    'paid',
    p_amount_total,
    lower(p_currency),
    'stripe',
    jsonb_build_object(
      'stripe_event_id', p_stripe_event_id,
      'payment_intent', p_payment_intent_id
    )
  )
  on conflict (stripe_session_id) do update
  set
    event_id = excluded.event_id,
    order_id = excluded.order_id,
    status = 'paid',
    amount_total = excluded.amount_total,
    currency = excluded.currency,
    provider = excluded.provider,
    metadata = public.payments.metadata || excluded.metadata;

  insert into public.event_entitlements (
    event_id,
    owner_id,
    launch_order_id,
    status,
    starts_at,
    expires_at,
    updated_at
  )
  values (
    p_event_id,
    launch_event.owner_id,
    p_order_id,
    'active',
    fulfilled_at,
    fulfilled_at + interval '1 year',
    fulfilled_at
  )
  on conflict (event_id) do update
  set
    owner_id = excluded.owner_id,
    launch_order_id = excluded.launch_order_id,
    status = 'active',
    updated_at = excluded.updated_at;

  -- This helper is idempotent because order_id is unique in the credit ledger.
  perform public.grant_launch_ai_credit(
    launch_event.owner_id,
    p_order_id,
    p_ai_bonus_cents
  );

  update public.events
  set
    status = 'published',
    rsvp_open = true,
    published_version_id = p_version_id,
    published_at = coalesce(published_at, fulfilled_at),
    updated_at = fulfilled_at
  where id = p_event_id;

  update public.page_artifacts
  set status = 'published'
  where event_id = p_event_id
    and version_id = p_version_id;

  return jsonb_build_object(
    'ok', true,
    'duplicate', duplicate_fulfillment
  );
end;
$$;

-- These functions are server-only RPCs. Postgres grants function execution to
-- PUBLIC by default, so explicitly remove browser roles before granting the
-- service role.
revoke all on function public.fulfill_event_launch(uuid, uuid, uuid, text, text, text, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.fulfill_event_launch(uuid, uuid, uuid, text, text, text, integer, text, integer)
  to service_role;

revoke all on function public.reserve_ai_build_credit(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.grant_launch_ai_credit(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_build_credit(uuid, uuid, integer) to service_role;
grant execute on function public.grant_launch_ai_credit(uuid, uuid, integer) to service_role;
