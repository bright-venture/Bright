-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Restricts deletion of inventory records (products, stock locations, stock
-- movements) to admins. Staff can still read, create, and edit them, but only an
-- admin may delete. Enforced by has_admin_access() (added in 202609170004).
-- Idempotent: safe to re-run. Contains no credentials.
begin;

drop policy if exists "portal delete products" on public.products;
create policy "admin delete products" on public.products for delete to authenticated using ((select public.has_admin_access()));

drop policy if exists "portal delete locations" on public.stock_locations;
create policy "admin delete locations" on public.stock_locations for delete to authenticated using ((select public.has_admin_access()));

drop policy if exists "portal delete movements" on public.stock_movements;
create policy "admin delete movements" on public.stock_movements for delete to authenticated using ((select public.has_admin_access()));

commit;
