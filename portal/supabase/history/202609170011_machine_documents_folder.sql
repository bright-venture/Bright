-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Lets a machine be linked to a Documents folder, where its saved report versions
-- are shown. Clearing the folder (or deleting it) just unassigns the machine.
-- Idempotent: safe to re-run. Contains no credentials.
begin;

alter table public.machines add column if not exists documents_folder_id uuid references public.portal_folders(id) on delete set null;
create index if not exists machines_documents_folder_idx on public.machines (documents_folder_id);

commit;
