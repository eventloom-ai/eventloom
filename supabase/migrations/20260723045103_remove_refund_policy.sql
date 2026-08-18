update public.legal_documents
set status = 'retired'
where document_key = 'refunds'
  and status <> 'retired';
