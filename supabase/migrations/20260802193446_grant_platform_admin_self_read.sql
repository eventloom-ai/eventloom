-- The policy alone does not grant table access. Without these grants both the
-- server-side entitlement check and the authenticated self-check receive a
-- permission error and incorrectly treat platform administrators as metered.
revoke all on table public.platform_admins from public, anon;
grant select on table public.platform_admins to authenticated, service_role;
