-- Bright portal (portal.brightlb.com): complete database schema for a NEW Supabase project.
-- Run once in the new project's SQL Editor. Contains no credentials and no data.
--
-- This is the final state of the 12 portal.tomatosky.com migrations (202609160001 to
-- 202609170012) consolidated into one file, so the data can be moved across unchanged:
-- same tables, columns (same order), constraints, indexes, grants, security functions
-- and row-level security policies. Left out on purpose: the TomatoSky brand seed rows
-- and the one-off data fix-ups those migrations ran on existing rows.
-- scripts/test-access.mjs checks this file against the original migrations.
--
-- Access model: nobody can read or write anything without (1) a signed-in Supabase user,
-- (2) an active row in portal_members and (3) a verified authenticator (MFA, aal2).
-- 'admin' and 'staff' share most rights; deleting records, managing brands and creating
-- or deleting machines are admin-only. Memberships are only provisioned by a trusted
-- administrator (SQL Editor or the portal's server-side admin key), never by employees.
begin;

-- ---------------------------------------------------------------- employees and brands

create table public.portal_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  role text not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint portal_members_role_check check (role in ('admin', 'staff'))
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- Approved employee (admin or staff), active, signed in with MFA.
create function public.has_portal_access()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    and exists (
      select 1 from public.portal_members
      where user_id = (select auth.uid())
        and active = true and role in ('admin', 'staff')
    );
$$;

-- Active admin signed in with MFA.
create function public.has_admin_access()
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
revoke all on function public.has_admin_access() from public, anon, authenticated;
grant execute on function public.has_portal_access() to authenticated;
grant execute on function public.has_admin_access() to authenticated;

-- ------------------------------------------------------------------------------ folders

create table public.portal_folders (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('inventory', 'documents', 'reports')),
  parent_id uuid references public.portal_folders(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  brand_id uuid references public.brands(id) on delete cascade
);
create index portal_folders_module_parent_idx on public.portal_folders (module, parent_id);
create index portal_folders_brand_idx on public.portal_folders (brand_id);

-- ---------------------------------------------------------------------------- inventory

create table public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  -- Deleting a brand unassigns its locations instead of deleting them, because
  -- a location can hold recorded stock movements (on delete restrict below).
  brand_id uuid references public.brands(id) on delete set null
);
create index stock_locations_brand_idx on public.stock_locations (brand_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  unit text not null default 'unit' check (length(trim(unit)) between 1 and 20),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid()
);
create index products_brand_idx on public.products (brand_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  kind text not null check (kind in ('receipt', 'dispatch')),
  quantity numeric(14,3) not null check (quantity > 0),
  note text check (note is null or length(note) <= 400),
  occurred_at date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid()
);
create index stock_movements_product_idx on public.stock_movements (product_id);
create index stock_movements_location_idx on public.stock_movements (location_id);

-- Running total per product. security_invoker so the querying employee's RLS applies.
create view public.product_on_hand with (security_invoker = true) as
  select product_id, sum(case when kind = 'receipt' then quantity else -quantity end)::numeric as on_hand
  from public.stock_movements
  group by product_id;

-- ---------------------------------------------------------------- machines and reports

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  location text check (location is null or length(trim(location)) between 1 and 160),
  status text not null default 'running' check (status in ('running', 'idle', 'maintenance', 'down')),
  notes text check (notes is null or length(notes) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  brand_id uuid references public.brands(id) on delete cascade,
  -- Which bilingual Bright Service report template applies to this machine.
  model text check (model is null or model in ('scrubmaster_b75r', 'walk_behind_scrubber')),
  asset_tag text check (asset_tag is null or length(trim(asset_tag)) between 1 and 80),
  -- Documents folder where this machine's saved report versions are shown.
  documents_folder_id uuid references public.portal_folders(id) on delete set null
);
create index machines_brand_idx on public.machines (brand_id);
create index machines_documents_folder_idx on public.machines (documents_folder_id);

-- Saved versions of a machine's report (one per report; re-saving updates it).
create table public.maintenance_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  model text not null check (model in ('scrubmaster_b75r', 'walk_behind_scrubber')),
  report_date date,
  maintenance_type text check (maintenance_type is null or maintenance_type in ('preventive', 'repair', 'breakdown')),
  operating_hours text,
  site_location text,
  machine_status text check (machine_status is null or machine_status in ('operational', 'needs_maintenance', 'waiting_parts', 'out_of_service')),
  problem_found text,
  work_performed text,
  parts_replaced text,
  parts_required text,
  next_maintenance date,
  technician_name text,
  checklist jsonb not null default '{}'::jsonb,
  function_test jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null default auth.uid()
);
create index report_snapshots_machine_idx on public.maintenance_report_snapshots (machine_id, saved_at desc);

-- The living, editable report: one per machine, linked to its current saved version.
create table public.maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  model text not null check (model in ('scrubmaster_b75r', 'walk_behind_scrubber')),
  report_date date not null default current_date,
  maintenance_type text check (maintenance_type is null or maintenance_type in ('preventive', 'repair', 'breakdown')),
  operating_hours text check (operating_hours is null or length(trim(operating_hours)) <= 40),
  site_location text check (site_location is null or length(site_location) <= 200),
  machine_status text check (machine_status is null or machine_status in ('operational', 'needs_maintenance', 'waiting_parts', 'out_of_service')),
  problem_found text check (problem_found is null or length(problem_found) <= 4000),
  work_performed text check (work_performed is null or length(work_performed) <= 4000),
  parts_replaced text check (parts_replaced is null or length(parts_replaced) <= 4000),
  parts_required text check (parts_required is null or length(parts_required) <= 4000),
  next_maintenance date,
  technician_name text check (technician_name is null or length(trim(technician_name)) between 1 and 160),
  checklist jsonb not null default '{}'::jsonb,
  function_test jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  current_snapshot_id uuid references public.maintenance_report_snapshots(id) on delete set null,
  constraint maintenance_reports_machine_key unique (machine_id)
);
create index maintenance_reports_machine_idx on public.maintenance_reports (machine_id, created_at desc);

-- ---------------------------------------------------------------------------- privileges

alter table public.portal_members enable row level security;
alter table public.brands enable row level security;
alter table public.portal_folders enable row level security;
alter table public.stock_locations enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.machines enable row level security;
alter table public.maintenance_report_snapshots enable row level security;
alter table public.maintenance_reports enable row level security;

-- Override Supabase's default grants: nothing for anonymous visitors; employees get
-- table privileges, and the row-level security policies below decide what they see.
revoke all on public.portal_members, public.brands, public.portal_folders,
  public.stock_locations, public.products, public.stock_movements, public.product_on_hand,
  public.machines, public.maintenance_report_snapshots, public.maintenance_reports
  from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.portal_members to authenticated;
grant select, insert, update, delete on public.brands, public.portal_folders,
  public.stock_locations, public.products, public.stock_movements, public.machines to authenticated;
grant select on public.product_on_hand to authenticated;
grant select, insert, update, delete on public.maintenance_report_snapshots, public.maintenance_reports to authenticated;

-- The service_role (server-side admin key, used only for employee administration)
-- bypasses RLS but still needs table privileges. Guarded for the local test harness.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.portal_members, public.brands, public.portal_folders,
      public.stock_locations, public.products, public.stock_movements, public.product_on_hand,
      public.machines, public.maintenance_report_snapshots, public.maintenance_reports to service_role;
  end if;
end $$;

-- ------------------------------------------------------------------- row-level security

-- An employee may read only their own membership, even before MFA (enables enrollment).
create policy "Read own membership" on public.portal_members for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Approved employees with MFA read brands" on public.brands for select to authenticated
  using ((select public.has_portal_access()));
create policy "admin create brands" on public.brands for insert to authenticated
  with check ((select public.has_admin_access()));
create policy "admin update brands" on public.brands for update to authenticated
  using ((select public.has_admin_access())) with check ((select public.has_admin_access()));
create policy "admin delete brands" on public.brands for delete to authenticated
  using ((select public.has_admin_access()));

create policy "Approved MFA employees read folders" on public.portal_folders for select to authenticated
  using ((select public.has_portal_access()));
create policy "Approved MFA employees create folders" on public.portal_folders for insert to authenticated
  with check ((select public.has_portal_access()));
create policy "Approved MFA employees rename or move folders" on public.portal_folders for update to authenticated
  using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "Approved MFA employees delete folders" on public.portal_folders for delete to authenticated
  using ((select public.has_portal_access()));

create policy "portal read locations" on public.stock_locations for select to authenticated using ((select public.has_portal_access()));
create policy "portal insert locations" on public.stock_locations for insert to authenticated with check ((select public.has_portal_access()));
create policy "portal update locations" on public.stock_locations for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "admin delete locations" on public.stock_locations for delete to authenticated using ((select public.has_admin_access()));

create policy "portal read products" on public.products for select to authenticated using ((select public.has_portal_access()));
create policy "portal insert products" on public.products for insert to authenticated with check ((select public.has_portal_access()));
create policy "portal update products" on public.products for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "admin delete products" on public.products for delete to authenticated using ((select public.has_admin_access()));

create policy "portal read movements" on public.stock_movements for select to authenticated using ((select public.has_portal_access()));
create policy "portal insert movements" on public.stock_movements for insert to authenticated with check ((select public.has_portal_access()));
create policy "portal update movements" on public.stock_movements for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "admin delete movements" on public.stock_movements for delete to authenticated using ((select public.has_admin_access()));

-- Any approved employee reads a machine (the QR state page) and updates its status/notes;
-- only admins create or delete machines.
create policy "portal read machines" on public.machines for select to authenticated using ((select public.has_portal_access()));
create policy "admin create machines" on public.machines for insert to authenticated with check ((select public.has_admin_access()));
create policy "portal update machines" on public.machines for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "admin delete machines" on public.machines for delete to authenticated using ((select public.has_admin_access()));

create policy "portal read snapshots" on public.maintenance_report_snapshots for select to authenticated using ((select public.has_portal_access()));
create policy "portal insert snapshots" on public.maintenance_report_snapshots for insert to authenticated with check ((select public.has_portal_access()));
create policy "portal update snapshots" on public.maintenance_report_snapshots for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "admin delete snapshots" on public.maintenance_report_snapshots for delete to authenticated using ((select public.has_admin_access()));

create policy "portal read reports" on public.maintenance_reports for select to authenticated using ((select public.has_portal_access()));
create policy "portal insert reports" on public.maintenance_reports for insert to authenticated with check ((select public.has_portal_access()));
create policy "portal update reports" on public.maintenance_reports for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "admin delete reports" on public.maintenance_reports for delete to authenticated using ((select public.has_admin_access()));

commit;
