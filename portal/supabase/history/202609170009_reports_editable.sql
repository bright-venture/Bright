-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Turns maintenance reports into one living, editable report per machine: any
-- approved MFA employee can edit a machine's report; only admins delete it.
-- Adds edit tracking and a one-report-per-machine constraint (dedupes first).
-- Idempotent: safe to re-run. Contains no credentials.
begin;

alter table public.maintenance_reports add column if not exists updated_at timestamptz not null default now();
alter table public.maintenance_reports add column if not exists updated_by uuid references auth.users(id) on delete set null;

-- Keep only the most recent report per machine, then enforce one per machine.
delete from public.maintenance_reports a
  using public.maintenance_reports b
  where a.machine_id = b.machine_id and a.created_at < b.created_at;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'maintenance_reports_machine_key') then
    alter table public.maintenance_reports add constraint maintenance_reports_machine_key unique (machine_id);
  end if;
end $$;

-- Anyone approved can now edit a report (delete stays admin-only from 202609170008).
grant update on public.maintenance_reports to authenticated;
drop policy if exists "portal update reports" on public.maintenance_reports;
create policy "portal update reports" on public.maintenance_reports for update to authenticated
  using ((select public.has_portal_access())) with check ((select public.has_portal_access()));

commit;
