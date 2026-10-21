-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Scopes folders (Documents + Reports), machines, and stock locations to a brand,
-- matching products which already carry brand_id. Brand is an organizational
-- attribute, not a permission boundary: any approved employee still sees every
-- brand, and the portal's brand selector filters each module. Existing rows keep
-- a null brand_id (they show only under "All brands") until reassigned.
-- Idempotent: safe to re-run. Contains no credentials.
begin;

-- Folders: one column scopes both the Documents and Reports trees. Deleting a
-- brand removes its folders (and their subfolders via the existing self-cascade).
alter table public.portal_folders add column if not exists brand_id uuid references public.brands(id) on delete cascade;
create index if not exists portal_folders_brand_idx on public.portal_folders (brand_id);

-- Machines belong to a brand; deleting a brand removes its machines.
alter table public.machines add column if not exists brand_id uuid references public.brands(id) on delete cascade;
create index if not exists machines_brand_idx on public.machines (brand_id);

-- Stock locations belong to a brand, but a location can hold recorded stock
-- movements (protected by on delete restrict). Deleting a brand therefore does
-- NOT delete its locations — it unassigns them (set null), preserving stock
-- history. An admin can reassign or delete them afterwards.
alter table public.stock_locations add column if not exists brand_id uuid references public.brands(id) on delete set null;
create index if not exists stock_locations_brand_idx on public.stock_locations (brand_id);

commit;
