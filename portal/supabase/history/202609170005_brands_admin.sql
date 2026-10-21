-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Lets admins manage brands (create, rename, delete). Reads stay open to any
-- approved MFA employee via the existing select policy. Only admins may write,
-- enforced by has_admin_access() (added in 202609170004). Idempotent: safe to
-- re-run. Contains no credentials.
begin;

-- The foundation migration granted only select; add the write privileges the
-- admin policies below rely on. Staff are still blocked by RLS (0 rows, no error).
grant insert, update, delete on public.brands to authenticated;

drop policy if exists "admin create brands" on public.brands;
create policy "admin create brands" on public.brands for insert to authenticated with check ((select public.has_admin_access()));

drop policy if exists "admin update brands" on public.brands;
create policy "admin update brands" on public.brands for update to authenticated using ((select public.has_admin_access())) with check ((select public.has_admin_access()));

drop policy if exists "admin delete brands" on public.brands;
create policy "admin delete brands" on public.brands for delete to authenticated using ((select public.has_admin_access()));

commit;
