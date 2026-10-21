-- Run once in the Supabase SQL Editor, after the portal foundation migration.
-- Adds employee-managed folders for the Inventory, Documents, and Reports modules.
-- Contains no credentials.
begin;

create table public.portal_folders (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('inventory', 'documents', 'reports')),
  parent_id uuid references public.portal_folders(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid()
);

create index portal_folders_module_parent_idx on public.portal_folders (module, parent_id);

alter table public.portal_folders enable row level security;

-- No anonymous access; approved employees with MFA get full folder management.
revoke all on public.portal_folders from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.portal_folders to authenticated;

create policy "Approved MFA employees read folders"
on public.portal_folders for select to authenticated
using ((select public.has_portal_access()));

create policy "Approved MFA employees create folders"
on public.portal_folders for insert to authenticated
with check ((select public.has_portal_access()));

create policy "Approved MFA employees rename or move folders"
on public.portal_folders for update to authenticated
using ((select public.has_portal_access()))
with check ((select public.has_portal_access()));

create policy "Approved MFA employees delete folders"
on public.portal_folders for delete to authenticated
using ((select public.has_portal_access()));

commit;
