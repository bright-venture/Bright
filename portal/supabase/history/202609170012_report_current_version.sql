-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- A saved version now represents one report, not one save: re-saving the current
-- report updates its version instead of adding another. Starting a New report
-- creates a new version. Links each report to its current version, and lets that
-- version be updated (by any approved MFA employee, like the report itself).
-- Idempotent: safe to re-run. Contains no credentials.
begin;

alter table public.maintenance_reports add column if not exists current_snapshot_id uuid
  references public.maintenance_report_snapshots(id) on delete set null;

-- Link existing reports to the version saved together with them (same save time).
update public.maintenance_reports r
set current_snapshot_id = (
  select s.id from public.maintenance_report_snapshots s
  where s.machine_id = r.machine_id and s.saved_at >= r.updated_at - interval '5 seconds'
  order by s.saved_at desc limit 1
)
where r.current_snapshot_id is null;

grant update on public.maintenance_report_snapshots to authenticated;
drop policy if exists "portal update snapshots" on public.maintenance_report_snapshots;
create policy "portal update snapshots" on public.maintenance_report_snapshots for update to authenticated
  using ((select public.has_portal_access())) with check ((select public.has_portal_access()));

commit;
