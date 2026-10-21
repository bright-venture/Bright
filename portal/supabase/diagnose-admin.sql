-- Read-only. Run in Supabase SQL Editor. Returns status flags only.
-- Does not return passwords, password hashes, tokens, or MFA secrets.
select
  u.id is not null as account_exists,
  u.email_confirmed_at is not null as email_confirmed,
  coalesce(length(u.encrypted_password) > 0, false) as password_is_set,
  m.user_id is not null as portal_membership_exists,
  coalesce(m.active and m.role = 'admin', false) as portal_access_enabled
from (values ('REPLACE_WITH_ADMIN_EMAIL')) as target(email)
left join auth.users u on lower(u.email) = lower(target.email)
left join public.portal_members m on m.user_id = u.id;
