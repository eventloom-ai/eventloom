create policy "Product feedback has no direct browser access"
on public.product_feedback
for all
to anon, authenticated
using (false)
with check (false);
