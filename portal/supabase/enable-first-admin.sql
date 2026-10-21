-- First create YOUR account in Authentication > Users > Add user > Create new user.
-- Use your own work email, choose a password privately, and auto-confirm YOUR email.
-- Then replace the two values below and run this separately in the SQL Editor.
-- Do not put a password in this file. Do not run for an unverified employee.
do $$
declare
  admin_email text := 'REPLACE_WITH_YOUR_EMAIL';
  admin_name text := 'REPLACE_WITH_YOUR_NAME';
  admin_id uuid;
begin
  if admin_email = 'REPLACE_WITH_YOUR_EMAIL' or admin_name = 'REPLACE_WITH_YOUR_NAME' then
    raise exception 'Replace the email and display name before running this script.';
  end if;
  select id into strict admin_id from auth.users
    where lower(email) = lower(trim(admin_email));
  insert into public.portal_members (user_id, display_name, role, active)
    values (admin_id, admin_name, 'admin', true)
    on conflict (user_id) do update
      set display_name = excluded.display_name, role = 'admin', active = true;
end $$;
