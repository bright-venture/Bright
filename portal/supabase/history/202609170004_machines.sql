-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Removes the unused product SKU and adds machines: physical equipment with a
-- printable QR. Only admins create/delete machines; any approved MFA employee can
-- read a machine's state and update its status/notes. Idempotent: safe to re-run.
-- Contains no credentials.
begin;

-- Products no longer carry a SKU.
alter table public.products drop column if exists sku;

-- Admin-only gate (active admin + MFA). Used for machine create/delete RLS.
create or replace function public.has_admin_access()
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
revoke all on function public.has_admin_access() from public, anon, authenticated;
grant execute on function public.has_admin_access() to authenticated;

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  location text check (location is null or length(trim(location)) between 1 and 160),
  status text not null default 'running' check (status in ('running', 'idle', 'maintenance', 'down')),
  notes text check (notes is null or length(notes) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid()
);

alter table public.machines enable row level security;

revoke all on public.machines from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.machines to authenticated;

-- Any approved MFA employee can read a machine (the scanned state page) and update
-- its status/notes. Only admins may create or delete machine records.
drop policy if exists "portal read machines" on public.machines;
create policy "portal read machines" on public.machines for select to authenticated using ((select public.has_portal_access()));
drop policy if exists "admin create machines" on public.machines;
create policy "admin create machines" on public.machines for insert to authenticated with check ((select public.has_admin_access()));
drop policy if exists "portal update machines" on public.machines;
create policy "portal update machines" on public.machines for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
drop policy if exists "admin delete machines" on public.machines;
create policy "admin delete machines" on public.machines for delete to authenticated using ((select public.has_admin_access()));

commit;
