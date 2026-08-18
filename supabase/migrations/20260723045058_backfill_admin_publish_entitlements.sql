-- Publishing without checkout is reserved for platform administrators. Ensure
-- those sites receive the same one-year entitlement required by the public
-- resolver, including sites published before that invariant was enforced.
insert into public.event_entitlements (
  event_id,
  owner_id,
  status,
  starts_at,
  expires_at,
  updated_at
)
select
  e.id,
  e.owner_id,
  'active',
  coalesce(e.published_at, now()),
  now() + interval '1 year',
  now()
from public.events e
join public.platform_admins pa on pa.user_id = e.owner_id
where e.status = 'published'
  and not exists (
    select 1
    from public.event_entitlements entitlement
    where entitlement.event_id = e.id
      and entitlement.status = 'active'
      and entitlement.expires_at > now()
  )
on conflict (event_id) do update
set
  owner_id = excluded.owner_id,
  status = 'active',
  starts_at = excluded.starts_at,
  expires_at = excluded.expires_at,
  updated_at = excluded.updated_at;
