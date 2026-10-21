-- Run once in the Supabase SQL Editor, after the earlier migrations.
-- Inventory v1: products (per brand), stock locations, and stock movements with
-- running-total on-hand. Approved MFA employees (admin or staff) manage all of it.
-- Contains no credentials.
begin;

create table public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  sku text check (sku is null or length(trim(sku)) between 1 and 60),
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

alter table public.stock_locations enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

revoke all on public.stock_locations, public.products, public.stock_movements from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.stock_locations, public.products, public.stock_movements to authenticated;
grant select on public.product_on_hand to authenticated;

-- One select/insert/update/delete policy per table, all gated by portal access.
create policy "portal read locations" on public.stock_locations for select to authenticated using ((select public.has_portal_access()));
create policy "portal insert locations" on public.stock_locations for insert to authenticated with check ((select public.has_portal_access()));
create policy "portal update locations" on public.stock_locations for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "portal delete locations" on public.stock_locations for delete to authenticated using ((select public.has_portal_access()));

create policy "portal read products" on public.products for select to authenticated using ((select public.has_portal_access()));
create policy "portal insert products" on public.products for insert to authenticated with check ((select public.has_portal_access()));
create policy "portal update products" on public.products for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "portal delete products" on public.products for delete to authenticated using ((select public.has_portal_access()));

create policy "portal read movements" on public.stock_movements for select to authenticated using ((select public.has_portal_access()));
create policy "portal insert movements" on public.stock_movements for insert to authenticated with check ((select public.has_portal_access()));
create policy "portal update movements" on public.stock_movements for update to authenticated using ((select public.has_portal_access())) with check ((select public.has_portal_access()));
create policy "portal delete movements" on public.stock_movements for delete to authenticated using ((select public.has_portal_access()));

commit;
