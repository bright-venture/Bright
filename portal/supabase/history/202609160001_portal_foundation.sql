-- Run once in this project's Supabase SQL Editor. Contains no credentials.
begin;

create table public.portal_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  role text not null default 'admin' check (role = 'admin'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.portal_members enable row level security;
alter table public.brands enable row level security;

-- Explicitly override default grants, including projects created with auto-exposure.
revoke all on public.portal_members, public.brands from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.portal_members, public.brands to authenticated;

-- An authenticated employee may read only their own membership before MFA.
-- This enables enrollment without granting access to operational records.
create policy "Read own membership"
on public.portal_members for select to authenticated
using ((select auth.uid()) = user_id);

create function public.has_portal_access()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    and exists (
      select 1 from public.portal_members
      where user_id = (select auth.uid())
        and active = true and role = 'admin'
    );
$$;

revoke all on function public.has_portal_access() from public, anon, authenticated;
grant execute on function public.has_portal_access() to authenticated;

create policy "Approved employees with MFA read brands"
on public.brands for select to authenticated
using ((select public.has_portal_access()));

-- No employee can create, promote, reactivate, or modify memberships via the API.
-- Membership provisioning currently happens only through the trusted SQL Editor.
-- Future operational tables must enforce has_portal_access() in their policies.
insert into public.brands (slug, name) values
  ('virginvalley', 'VirginValley'),
  ('black-beauty-tomato', 'Black Beauty Tomato');

commit;
