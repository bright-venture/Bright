-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Digital maintenance reports: each machine has a model (which report template
-- applies), and technicians submit reports by scanning the machine's QR. Any
-- approved MFA employee can create and read reports; only admins may delete one.
-- Reports are immutable once submitted (no update policy). Idempotent: safe to
-- re-run. Contains no credentials.
begin;

-- Which report template a machine uses, and an optional printed asset identifier.
alter table public.machines add column if not exists model text
  check (model is null or model in ('scrubmaster_b75r', 'walk_behind_scrubber'));
alter table public.machines add column if not exists asset_tag text
  check (asset_tag is null or length(trim(asset_tag)) between 1 and 80);

create table if not exists public.maintenance_reports (
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
  created_by uuid references auth.users(id) on delete set null default auth.uid()
);
create index if not exists maintenance_reports_machine_idx on public.maintenance_reports (machine_id, created_at desc);

alter table public.maintenance_reports enable row level security;
revoke all on public.maintenance_reports from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on public.maintenance_reports to authenticated;

drop policy if exists "portal read reports" on public.maintenance_reports;
create policy "portal read reports" on public.maintenance_reports for select to authenticated using ((select public.has_portal_access()));
drop policy if exists "portal insert reports" on public.maintenance_reports;
create policy "portal insert reports" on public.maintenance_reports for insert to authenticated with check ((select public.has_portal_access()));
drop policy if exists "admin delete reports" on public.maintenance_reports;
create policy "admin delete reports" on public.maintenance_reports for delete to authenticated using ((select public.has_admin_access()));

commit;
