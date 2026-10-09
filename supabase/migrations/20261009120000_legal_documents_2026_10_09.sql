-- Legal documents, version 2026-10-09 (LEGAL_VERSION in src/lib/legal-version.ts).
--
-- Adds the Refund and Cancellation Policy back (retired by 20260723045103_remove_refund_policy), plus the new
-- Content Reporting and Enforcement and Copyright and Takedown pages, and rewrites every other policy.
--
-- content_sha256 is the SHA-256 of legalDocumentCanonicalText(document) in src/lib/legal-documents.ts: the exact
-- text served at /legal/<slug> for this version. (Earlier rows hashed only '<key>:<version>' as placeholders.)
-- src/lib/tests/legal-documents.test.ts recomputes the hashes and fails if code and this file drift; on failure it
-- prints the rows to paste here.
--
-- Rollout: apply this migration and deploy the commit that sets LEGAL_VERSION = '2026-10-09' back to back.
-- In between, the running code asks for a version that is not active, so checkout and terms acceptance fail
-- closed with legal_documents_not_ready (409/503) and no payment is taken. Stripe sessions created before the
-- switch still fulfil: the webhook does not re-check legal documents.
--
-- Existing creators: profiles.legal_version stays at the old value, so hasCreatorLegalOnboarding() is false until
-- they accept 2026-10-09 at /app/legal-acceptance (the dashboard asks them after sign-in). Old acceptances keep
-- pointing at the retired rows as the record of what was accepted then.

-- legal-documents:start
insert into public.legal_documents (document_key, version, title, content_sha256, status, effective_at)
values
  ('terms', '2026-10-09', 'Terms of Service', '3357d96b224911721613ebf3292d4b7c9b3d7c272fa0ee2bda0cab65294ed7eb', 'active', now()),
  ('privacy', '2026-10-09', 'Privacy Policy', '206f5b51743f2ff784deac6c4152a7fef0c183ac0416acde57da17f60f237cec', 'active', now()),
  ('refunds', '2026-10-09', 'Refund and Cancellation Policy', 'e0e576ef44d2e6a8bf487ff54e94330abd1196a94deecad68c57373a9e9a9cf2', 'active', now()),
  ('acceptable-use', '2026-10-09', 'Acceptable Use Policy', '89b5a54acfef0e5fe008f673ff0cff82f4122dea6bb5b8eb1e0f71f45c185981', 'active', now()),
  ('reporting', '2026-10-09', 'Content Reporting and Enforcement', '09338bf78f92bdb5b589781b9a8defbb30064e5c0b79ae571d6cade7d644c88a', 'active', now()),
  ('copyright', '2026-10-09', 'Copyright and Takedown Policy', 'dd3a5ce1bf136ddc04288fe73c40721224481563e25f754aa70aa6b2f9696920', 'active', now()),
  ('cookies', '2026-10-09', 'Cookie and Tracking Notice', '0917bad8796287c717f3495eaf5843a7d76cb050dd95d8b14323977ba1a6b483', 'active', now()),
  ('subprocessors', '2026-10-09', 'Subprocessors and International Transfers', '4e4d72d331c7e89d726cf2593efb67ecbb37170ef1999296707e949645b24e4e', 'active', now()),
  ('dpa', '2026-10-09', 'Creator Data Processing Addendum', '827c7caeeed6c956a4409186d8f2099a0a9ac690eaf493c8b00deafd2c3f2412', 'active', now()),
  ('domains', '2026-10-09', 'Domain Registration, Renewal, and Transfer Policy', 'eac24f04f658f3a6137acbd1f5430c7b94dd41b47c41ad145b4ccfd13a375da2', 'active', now()),
  ('accessibility', '2026-10-09', 'Accessibility Statement', '04e29065d333c49827f61524fcff07f9cebaeb12be818748004bbb5c3c42f462', 'active', now()),
  ('security', '2026-10-09', 'Security and Responsible Disclosure', '79521ff621aa8bd9e1db64fc8a101ba6d6edabc43f191508a9354ef14c382683', 'active', now())
on conflict (document_key, version) do update set
  title = excluded.title,
  content_sha256 = excluded.content_sha256,
  status = 'active',
  effective_at = coalesce(public.legal_documents.effective_at, excluded.effective_at);
-- legal-documents:end

update public.legal_documents
set status = 'retired'
where version <> '2026-10-09'
  and status <> 'retired';
