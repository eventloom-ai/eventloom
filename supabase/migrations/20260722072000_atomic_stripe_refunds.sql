alter table public.payments add column if not exists refunded_amount integer not null default 0 check (refunded_amount >= 0);

create or replace function public.record_stripe_refund(
  p_payment_intent_id text,
  p_charge_id text,
  p_amount integer,
  p_amount_refunded integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare payment_row public.payments%rowtype;
declare full_refund boolean;
begin
  if nullif(btrim(p_payment_intent_id), '') is null or p_amount <= 0 or p_amount_refunded <= 0 or p_amount_refunded > p_amount then
    raise exception 'invalid_refund';
  end if;
  select * into payment_row from public.payments
    where metadata ->> 'payment_intent' = p_payment_intent_id
    for update;
  if not found then raise exception 'payment_not_found'; end if;
  full_refund := p_amount_refunded >= p_amount;
  update public.payments set
    refunded_amount = greatest(refunded_amount, p_amount_refunded),
    status = case when full_refund then 'refunded' else status end,
    metadata = metadata || jsonb_build_object('last_refund_charge', p_charge_id)
  where id = payment_row.id;
  if full_refund then
    update public.orders set status = 'refunded', updated_at = now() where id = payment_row.order_id;
    update public.event_entitlements set status = 'revoked', updated_at = now() where launch_order_id = payment_row.order_id;
    update public.events set status = 'archived', rsvp_open = false, updated_at = now() where id = payment_row.event_id;
  end if;
  insert into public.audit_events(event_id, actor_type, action, target_type, target_id, metadata)
  values (payment_row.event_id, 'system', 'payment.refund.recorded', 'payment', payment_row.id, jsonb_build_object('full_refund', full_refund, 'amount_refunded', p_amount_refunded));
  return jsonb_build_object('ok', true, 'full_refund', full_refund, 'event_id', payment_row.event_id, 'order_id', payment_row.order_id);
end;
$$;
revoke all on function public.record_stripe_refund(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.record_stripe_refund(text, text, integer, integer) to service_role;
