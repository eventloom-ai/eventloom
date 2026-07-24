create index if not exists product_feedback_actionable_created_idx
  on public.product_feedback (created_at)
  where status in ('new', 'reviewing', 'planned');
