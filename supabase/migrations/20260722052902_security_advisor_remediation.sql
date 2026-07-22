-- Remediate the actionable findings returned by Supabase's security advisor.

revoke all on function public.consume_rsvp_rate_limit(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rsvp_rate_limit(text, integer, integer, integer) to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
revoke execute on function public.is_organization_member(uuid) from public, anon;
revoke execute on function public.is_organization_owner(uuid) from public, anon;

alter function public.valid_guest_names(text[]) set search_path = '';

-- These tables intentionally have no browser-visible rows. Explicit deny
-- policies document that design and keep the advisor from treating the lack
-- of policies as an accidental omission.
create policy "Browser access denied" on public.domain_registrant_payloads
  for all to anon, authenticated using (false) with check (false);
create policy "Browser access denied" on public.legal_documents
  for all to anon, authenticated using (false) with check (false);
create policy "Browser access denied" on public.provider_webhook_events
  for all to anon, authenticated using (false) with check (false);

-- Cover high-frequency ownership, retention, and fulfillment relationships.
create index if not exists assets_event_id_idx on public.assets(event_id);
create index if not exists audit_events_actor_user_id_idx on public.audit_events(actor_user_id);
create index if not exists ai_credit_ledger_event_id_idx on public.ai_credit_ledger(event_id);
create index if not exists fulfillment_attempts_job_id_idx on public.fulfillment_attempts(job_id);
create index if not exists legal_acceptances_document_id_idx on public.legal_acceptances(document_id);
create index if not exists legal_acceptances_user_id_idx on public.legal_acceptances(user_id);
create index if not exists privacy_requests_requester_user_id_idx on public.privacy_requests(requester_user_id);
