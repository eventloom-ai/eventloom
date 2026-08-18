-- Allow an authenticated user to learn only whether they are a platform admin.
-- This keeps the table tenant-safe while allowing the app to operate when the
-- server-only Supabase key is unavailable and the owner session is valid.
create policy "Users can read their own platform admin flag"
  on public.platform_admins
  for select
  to authenticated
  using (user_id = auth.uid());
