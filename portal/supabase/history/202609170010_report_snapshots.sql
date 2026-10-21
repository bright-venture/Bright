-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Keeps a version history of maintenance reports: every save appends an immutable
-- snapshot. Any approved MFA employee can create and read snapshots; only admins
-- delete one. Idempotent: safe to re-run. Contains no credentials.
begin;

create table if not exists public.maintenance_report_snapshots (
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
create index if not exists report_snapshots_machine_idx on public.maintenance_report_snapshots (machine_id, saved_at desc);

alter table public.maintenance_report_snapshots enable row level security;
revoke all on public.maintenance_report_snapshots from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on public.maintenance_report_snapshots to authenticated;

drop policy if exists "portal read snapshots" on public.maintenance_report_snapshots;
create policy "portal read snapshots" on public.maintenance_report_snapshots for select to authenticated using ((select public.has_portal_access()));
drop policy if exists "portal insert snapshots" on public.maintenance_report_snapshots;
create policy "portal insert snapshots" on public.maintenance_report_snapshots for insert to authenticated with check ((select public.has_portal_access()));
drop policy if exists "admin delete snapshots" on public.maintenance_report_snapshots;
create policy "admin delete snapshots" on public.maintenance_report_snapshots for delete to authenticated using ((select public.has_admin_access()));

commit;
