-- Extend paid launch fulfillment with optional custom-domain provisioning.
-- The original overload remains available during a rolling deployment; this
-- overload calls it inside the same transaction and then records the domain.
alter table public.domains
  add column if not exists order_id uuid unique references public.orders(id) on delete set null;

create or replace function public.claim_domain_fulfillment(
  p_event_id uuid,
  p_order_id uuid,
  p_domain text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_domain text := nullif(lower(btrim(p_domain)), '');
  launch_order public.orders%rowtype;
  existing_domain public.domains%rowtype;
begin
  if requested_domain is null
    or requested_domain !~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$'
    or length(requested_domain) > 253
  then
    raise exception 'invalid_domain_claim';
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
    or nullif(lower(btrim(launch_order.metadata ->> 'domain')), '') <> requested_domain
  then
    raise exception 'invalid_domain_claim_order';
  end if;

  select *
  into existing_domain
  from public.domains
  where domain = requested_domain
  for update;

  if found then
    if existing_domain.order_id is distinct from p_order_id
      or existing_domain.event_id <> p_event_id
    then
      raise exception 'domain_claimed_by_another_order';
    end if;
  else
    insert into public.domains (event_id, order_id, domain, status)
    values (p_event_id, p_order_id, requested_domain, 'quoted');
  end if;

  return jsonb_build_object('ok', true, 'domain', requested_domain);
end;
$$;

revoke all on function public.claim_domain_fulfillment(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_domain_fulfillment(uuid, uuid, text)
  to service_role;

create or replace function public.fulfill_event_launch(
  p_event_id uuid,
  p_order_id uuid,
  p_version_id uuid,
  p_stripe_session_id text,
  p_stripe_event_id text,
  p_payment_intent_id text,
  p_amount_total integer,
  p_currency text,
  p_ai_bonus_cents integer,
  p_domain text,
  p_domain_provider_id text,
  p_domain_registration_cost numeric,
  p_domain_renewal_cost numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  fulfillment_result jsonb;
  requested_domain text;
  existing_domain_event_id uuid;
  existing_domain_order_id uuid;
begin
  select nullif(lower(btrim(metadata ->> 'domain')), '')
  into requested_domain
  from public.orders
  where id = p_order_id
    and event_id = p_event_id;

  if requested_domain is distinct from nullif(lower(btrim(p_domain)), '') then
    raise exception 'invalid_launch_domain';
  end if;

  if requested_domain is not null then
    if requested_domain !~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$'
      or length(requested_domain) > 253
      or nullif(btrim(p_domain_provider_id), '') is null
      or p_domain_registration_cost is null
      or p_domain_registration_cost < 0
      or p_domain_renewal_cost is null
      or p_domain_renewal_cost < 0
    then
      raise exception 'invalid_domain_fulfillment_input';
    end if;

    select event_id, order_id
    into existing_domain_event_id, existing_domain_order_id
    from public.domains
    where domain = requested_domain
    for update;

    if existing_domain_event_id is null
      or existing_domain_event_id <> p_event_id
      or existing_domain_order_id is distinct from p_order_id
    then
      raise exception 'domain_not_claimed_by_launch_order';
    end if;
  elsif p_domain_provider_id is not null
    or p_domain_registration_cost is not null
    or p_domain_renewal_cost is not null
  then
    raise exception 'unexpected_domain_fulfillment_input';
  end if;

  fulfillment_result := public.fulfill_event_launch(
    p_event_id,
    p_order_id,
    p_version_id,
    p_stripe_session_id,
    p_stripe_event_id,
    p_payment_intent_id,
    p_amount_total,
    p_currency,
    p_ai_bonus_cents
  );

  if requested_domain is not null then
    insert into public.domains (
      event_id,
      order_id,
      domain,
      status,
      registration_cost_usd,
      renewal_cost_usd,
      provider_id,
      failure_reason,
      updated_at
    )
    values (
      p_event_id,
      p_order_id,
      requested_domain,
      'vercel_pending',
      p_domain_registration_cost,
      p_domain_renewal_cost,
      p_domain_provider_id,
      null,
      now()
    )
    on conflict (domain) do update
    set
      event_id = excluded.event_id,
      order_id = excluded.order_id,
      status = excluded.status,
      registration_cost_usd = excluded.registration_cost_usd,
      renewal_cost_usd = excluded.renewal_cost_usd,
      provider_id = excluded.provider_id,
      failure_reason = null,
      updated_at = excluded.updated_at;
  end if;

  return fulfillment_result || jsonb_build_object('domain', requested_domain);
end;
$$;

revoke all on function public.fulfill_event_launch(
  uuid, uuid, uuid, text, text, text, integer, text, integer,
  text, text, numeric, numeric
) from public, anon, authenticated;
grant execute on function public.fulfill_event_launch(
  uuid, uuid, uuid, text, text, text, integer, text, integer,
  text, text, numeric, numeric
) to service_role;
