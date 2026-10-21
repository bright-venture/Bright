import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Test the actual migration in isolated PostgreSQL, with Supabase claim helpers.
// This does not connect to or create users in the live project.
test('portal database permissions', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid;
      $$;
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
      $$;
      grant usage on schema auth to anon, authenticated;
    `);
    // Apply every migration in order (the consolidated Bright schema), then seed two test
    // brands as the database owner: the schema itself ships with no data.
    const migrations = new URL('../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, migrations), 'utf8'));
    await db.exec("insert into public.brands (slug, name) values ('client-a', 'Client A'), ('client-b', 'Client B')");
    const alice = '00000000-0000-0000-0000-000000000001';
    const bob = '00000000-0000-0000-0000-000000000002';
    const inactive = '00000000-0000-0000-0000-000000000003';
    const outsider = '00000000-0000-0000-0000-000000000004';
    for (const id of [alice, bob, inactive, outsider]) await db.query('insert into auth.users values ($1, $2)', [id, `${id}@example.invalid`]);
    for (const [id, active] of [[alice, true], [bob, true], [inactive, false]]) await db.query('insert into public.portal_members (user_id, display_name, active) values ($1, $2, $3)', [id, 'Test employee', active]);

    async function asUser(id, aal, role = 'authenticated') {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: id, aal, user_metadata: { role: 'admin' } })]);
      await db.exec(`set role ${role}`);
    }

    await t.test('anonymous visitors cannot read brands or memberships', async () => {
      await asUser(null, null, 'anon');
      await assert.rejects(db.query('select * from public.brands'), /permission denied/);
      await assert.rejects(db.query('select * from public.portal_members'), /permission denied/);
      await assert.rejects(db.query('select public.has_portal_access()'), /permission denied/);
    });
    await t.test('password-only employees see their membership, but no brands', async () => {
      await asUser(alice, 'aal1');
      assert.equal((await db.query('select * from public.portal_members')).rows.length, 1);
      assert.equal((await db.query('select * from public.brands')).rows.length, 0);
    });
    await t.test('approved MFA employee reads the two test brands', async () => {
      await asUser(alice, 'aal2');
      assert.deepEqual((await db.query('select name from public.brands order by name')).rows.map(row => row.name), ['Client A', 'Client B']);
    });
    await t.test('employees cannot inspect another membership', async () => {
      await asUser(alice, 'aal2');
      assert.deepEqual((await db.query('select user_id from public.portal_members')).rows.map(row => row.user_id), [alice]);
    });
    await t.test('unapproved MFA user cannot read brands even with admin user_metadata', async () => {
      await asUser(outsider, 'aal2');
      assert.equal((await db.query('select * from public.brands')).rows.length, 0);
      assert.equal((await db.query('select public.has_portal_access() as allowed')).rows[0].allowed, false);
    });
    await t.test('deactivated MFA employee is blocked', async () => {
      await asUser(inactive, 'aal2');
      assert.equal((await db.query('select * from public.brands')).rows.length, 0);
    });
    await t.test('missing MFA claim fails closed', async () => {
      await asUser(alice, undefined);
      assert.equal((await db.query('select * from public.brands')).rows.length, 0);
    });
    await t.test('approved MFA employee creates, renames, and deletes folders', async () => {
      await asUser(alice, 'aal2');
      const id = (await db.query("insert into public.portal_folders (module, name) values ('documents', 'Contracts') returning id")).rows[0].id;
      assert.equal((await db.query('select name from public.portal_folders where id = $1', [id])).rows[0].name, 'Contracts');
      await db.query("update public.portal_folders set name = 'Signed contracts' where id = $1", [id]);
      assert.equal((await db.query('select name from public.portal_folders where id = $1', [id])).rows[0].name, 'Signed contracts');
      await db.query('delete from public.portal_folders where id = $1', [id]);
      assert.equal((await db.query('select * from public.portal_folders')).rows.length, 0);
    });
    await t.test('deleting a folder cascades to its subfolders', async () => {
      await asUser(alice, 'aal2');
      const parent = (await db.query("insert into public.portal_folders (module, name) values ('inventory', 'Warehouse A') returning id")).rows[0].id;
      await db.query("insert into public.portal_folders (module, name, parent_id) values ('inventory', 'Shelf 1', $1)", [parent]);
      assert.equal((await db.query('select * from public.portal_folders')).rows.length, 2);
      await db.query('delete from public.portal_folders where id = $1', [parent]);
      assert.equal((await db.query('select * from public.portal_folders')).rows.length, 0);
    });
    await t.test('anonymous and password-only users cannot access folders', async () => {
      await asUser(null, null, 'anon');
      await assert.rejects(db.query('select * from public.portal_folders'), /permission denied/);
      await asUser(alice, 'aal1');
      assert.equal((await db.query('select * from public.portal_folders')).rows.length, 0);
      await assert.rejects(db.query("insert into public.portal_folders (module, name) values ('reports', 'Blocked')"), /row-level security/);
    });
    await t.test('unapproved MFA user cannot create folders', async () => {
      await asUser(outsider, 'aal2');
      await assert.rejects(db.query("insert into public.portal_folders (module, name) values ('documents', 'Blocked')"), /row-level security/);
    });
    await t.test('the module check constraint rejects unknown modules', async () => {
      await asUser(alice, 'aal2');
      await assert.rejects(db.query("insert into public.portal_folders (module, name) values ('payroll', 'Nope')"), /violates check constraint/);
    });
    await t.test('a staff member with MFA can use the portal and folders', async () => {
      await db.exec('reset role');
      const staff = '00000000-0000-0000-0000-000000000005';
      await db.query('insert into auth.users values ($1, $2)', [staff, 'staff@example.invalid']);
      await db.query("insert into public.portal_members (user_id, display_name, role, active) values ($1, 'Staff member', 'staff', true)", [staff]);
      await asUser(staff, 'aal2');
      assert.equal((await db.query('select * from public.brands')).rows.length, 2);
      await db.query("insert into public.portal_folders (module, name) values ('documents', 'Staff folder')");
      assert.equal((await db.query("select * from public.portal_folders where name = 'Staff folder'")).rows.length, 1);
      await db.query("delete from public.portal_folders where name = 'Staff folder'");
    });
    await t.test('the role check constraint allows admin/staff and rejects others', async () => {
      await db.exec('reset role');
      const ghost = '00000000-0000-0000-0000-000000000006';
      await db.query('insert into auth.users values ($1, $2)', [ghost, 'ghost@example.invalid']);
      await assert.rejects(db.query("insert into public.portal_members (user_id, display_name, role) values ($1, 'Ghost', 'guest')", [ghost]), /violates check constraint/);
    });
    await t.test('approved MFA employee manages inventory and on-hand updates', async () => {
      await asUser(alice, 'aal2');
      const brandId = (await db.query('select id from public.brands order by name limit 1')).rows[0].id;
      const locId = (await db.query("insert into public.stock_locations (name) values ('Cold room') returning id")).rows[0].id;
      const prodId = (await db.query("insert into public.products (brand_id, name, unit) values ($1, 'Floor cleaner', 'litre') returning id", [brandId])).rows[0].id;
      await db.query("insert into public.stock_movements (product_id, location_id, kind, quantity) values ($1, $2, 'receipt', 100)", [prodId, locId]);
      await db.query("insert into public.stock_movements (product_id, location_id, kind, quantity) values ($1, $2, 'dispatch', 30)", [prodId, locId]);
      const onHand = (await db.query('select on_hand from public.product_on_hand where product_id = $1', [prodId])).rows[0].on_hand;
      assert.equal(Number(onHand), 70);
    });
    await t.test('a location with movements cannot be deleted (admin, blocked by restrict)', async () => {
      await db.exec('reset role');
      const adminL = '00000000-0000-0000-0000-00000000000a';
      await db.query('insert into auth.users values ($1, $2)', [adminL, 'adminL@example.invalid']);
      await db.query("insert into public.portal_members (user_id, display_name, role, active) values ($1, 'Admin L', 'admin', true)", [adminL]);
      await asUser(adminL, 'aal2');
      const locId = (await db.query('select id from public.stock_locations limit 1')).rows[0].id;
      await assert.rejects(db.query('delete from public.stock_locations where id = $1', [locId]), /foreign key|still referenced/i);
    });
    await t.test('inventory deletes are admin-only; staff create but cannot delete', async () => {
      await asUser(alice, 'aal2');
      const brandId = (await db.query('select id from public.brands order by name limit 1')).rows[0].id;
      const locId = (await db.query("insert into public.stock_locations (name) values ('Staff loc') returning id")).rows[0].id;
      const prodId = (await db.query("insert into public.products (brand_id, name, unit) values ($1, 'Staff prod', 'kg') returning id", [brandId])).rows[0].id;
      const movId = (await db.query("insert into public.stock_movements (product_id, location_id, kind, quantity) values ($1, $2, 'receipt', 5) returning id", [prodId, locId])).rows[0].id;
      // Staff deletes are blocked by RLS: 0 rows removed, no error.
      await db.query('delete from public.stock_movements where id = $1', [movId]);
      assert.equal((await db.query('select * from public.stock_movements where id = $1', [movId])).rows.length, 1);
      await db.query('delete from public.products where id = $1', [prodId]);
      assert.equal((await db.query('select * from public.products where id = $1', [prodId])).rows.length, 1);
      await db.query('delete from public.stock_locations where id = $1', [locId]);
      assert.equal((await db.query('select * from public.stock_locations where id = $1', [locId])).rows.length, 1);
      // An admin can delete them (movement, then product, then the now-unreferenced location).
      await db.exec('reset role');
      const adminI = '00000000-0000-0000-0000-00000000000b';
      await db.query('insert into auth.users values ($1, $2)', [adminI, 'adminI@example.invalid']);
      await db.query("insert into public.portal_members (user_id, display_name, role, active) values ($1, 'Admin I', 'admin', true)", [adminI]);
      await asUser(adminI, 'aal2');
      await db.query('delete from public.stock_movements where id = $1', [movId]);
      await db.query('delete from public.products where id = $1', [prodId]);
      await db.query('delete from public.stock_locations where id = $1', [locId]);
      assert.equal((await db.query('select * from public.stock_locations where id = $1', [locId])).rows.length, 0);
    });
    await t.test('anonymous and password-only users cannot access inventory', async () => {
      await asUser(null, null, 'anon');
      await assert.rejects(db.query('select * from public.products'), /permission denied/);
      await asUser(alice, 'aal1');
      assert.equal((await db.query('select * from public.products')).rows.length, 0);
      await assert.rejects(db.query("insert into public.stock_locations (name) values ('Blocked')"), /row-level security/);
    });
    await t.test('machines: admins create/delete; staff read and update state but cannot create/delete', async () => {
      await db.exec('reset role');
      const adminU = '00000000-0000-0000-0000-000000000007';
      await db.query('insert into auth.users values ($1, $2)', [adminU, 'admin7@example.invalid']);
      await db.query("insert into public.portal_members (user_id, display_name, role, active) values ($1, 'Admin seven', 'admin', true)", [adminU]);
      await asUser(adminU, 'aal2');
      const machineId = (await db.query("insert into public.machines (name) values ('Packing line 1') returning id")).rows[0].id;
      assert.equal((await db.query('select name from public.machines where id = $1', [machineId])).rows[0].name, 'Packing line 1');
      // Staff (alice defaults to staff) can read + update state, but not create or delete.
      await asUser(alice, 'aal2');
      assert.equal((await db.query('select * from public.machines')).rows.length, 1);
      await db.query("update public.machines set status = 'maintenance' where id = $1", [machineId]);
      assert.equal((await db.query('select status from public.machines where id = $1', [machineId])).rows[0].status, 'maintenance');
      await assert.rejects(db.query("insert into public.machines (name) values ('Sneaky')"), /row-level security/);
      await db.query('delete from public.machines where id = $1', [machineId]); // RLS blocks: deletes 0 rows, no error
      assert.equal((await db.query('select * from public.machines where id = $1', [machineId])).rows.length, 1);
      // Admin can delete.
      await asUser(adminU, 'aal2');
      await db.query('delete from public.machines where id = $1', [machineId]);
      assert.equal((await db.query('select * from public.machines')).rows.length, 0);
    });
    await t.test('anonymous users cannot access machines', async () => {
      await asUser(null, null, 'anon');
      await assert.rejects(db.query('select * from public.machines'), /permission denied/);
    });
    await t.test('users cannot self-provision or reactivate memberships', async () => {
      await asUser(outsider, 'aal2');
      await assert.rejects(db.query('insert into public.portal_members (user_id, display_name) values ($1, $2)', [outsider, 'Self promotion']), /permission denied/);
      await asUser(inactive, 'aal2');
      await assert.rejects(db.query('update public.portal_members set active = true'), /permission denied/);
    });
    await t.test('approved staff cannot delete memberships via API', async () => {
      await asUser(alice, 'aal2');
      await assert.rejects(db.query('delete from public.portal_members'), /permission denied/);
    });
    await t.test('brands: admins create/rename/delete; staff and outsiders cannot', async () => {
      await db.exec('reset role');
      const adminB = '00000000-0000-0000-0000-000000000008';
      await db.query('insert into auth.users values ($1, $2)', [adminB, 'admin8@example.invalid']);
      await db.query("insert into public.portal_members (user_id, display_name, role, active) values ($1, 'Admin eight', 'admin', true)", [adminB]);
      await asUser(adminB, 'aal2');
      const brandId = (await db.query("insert into public.brands (slug, name) values ('new-brand', 'New Brand') returning id")).rows[0].id;
      await db.query("update public.brands set name = 'Renamed Brand' where id = $1", [brandId]);
      assert.equal((await db.query('select name from public.brands where id = $1', [brandId])).rows[0].name, 'Renamed Brand');
      // Staff (alice) can read but RLS blocks writes: 0 rows changed, no error.
      await asUser(alice, 'aal2');
      await db.query("update public.brands set name = 'Hacked' where id = $1", [brandId]);
      assert.equal((await db.query('select name from public.brands where id = $1', [brandId])).rows[0].name, 'Renamed Brand');
      await assert.rejects(db.query("insert into public.brands (slug, name) values ('sneaky', 'Sneaky')"), /row-level security/);
      await db.query('delete from public.brands where id = $1', [brandId]); // RLS blocks: deletes 0 rows
      assert.equal((await db.query('select * from public.brands where id = $1', [brandId])).rows.length, 1);
      // Outsider (approved MFA but not a member) is blocked too.
      await asUser(outsider, 'aal2');
      await assert.rejects(db.query("insert into public.brands (slug, name) values ('out', 'Out')"), /row-level security/);
      // Admin can delete.
      await asUser(adminB, 'aal2');
      await db.query('delete from public.brands where id = $1', [brandId]);
      assert.equal((await db.query('select * from public.brands where id = $1', [brandId])).rows.length, 0);
    });
    await t.test('deleting a brand cascades to its folders and machines, and unassigns its locations', async () => {
      await db.exec('reset role');
      const adminC = '00000000-0000-0000-0000-000000000009';
      await db.query('insert into auth.users values ($1, $2)', [adminC, 'admin9@example.invalid']);
      await db.query("insert into public.portal_members (user_id, display_name, role, active) values ($1, 'Admin nine', 'admin', true)", [adminC]);
      await asUser(adminC, 'aal2');
      const brandId = (await db.query("insert into public.brands (slug, name) values ('scoped', 'Scoped Brand') returning id")).rows[0].id;
      await db.query("insert into public.portal_folders (module, name, brand_id) values ('documents', 'Brand doc', $1)", [brandId]);
      await db.query("insert into public.machines (name, brand_id) values ('Brand machine', $1)", [brandId]);
      const locId = (await db.query("insert into public.stock_locations (name, brand_id) values ('Brand cold room', $1) returning id", [brandId])).rows[0].id;
      const prodId = (await db.query("insert into public.products (brand_id, name, unit) values ($1, 'Scoped product', 'litre') returning id", [brandId])).rows[0].id;
      await db.query("insert into public.stock_movements (product_id, location_id, kind, quantity) values ($1, $2, 'receipt', 10)", [prodId, locId]);
      // Deleting the brand must succeed even though the location is referenced by a
      // movement (restrict): the location is unassigned, not deleted, so no conflict.
      await db.query('delete from public.brands where id = $1', [brandId]);
      assert.equal((await db.query('select * from public.portal_folders where brand_id = $1', [brandId])).rows.length, 0);
      assert.equal((await db.query('select * from public.machines where brand_id = $1', [brandId])).rows.length, 0);
      assert.equal((await db.query('select * from public.products where id = $1', [prodId])).rows.length, 0);
      assert.equal((await db.query('select * from public.stock_movements where product_id = $1', [prodId])).rows.length, 0);
      assert.equal((await db.query('select brand_id from public.stock_locations where id = $1', [locId])).rows[0].brand_id, null);
    });
    await t.test('maintenance reports: technicians create and read; only admins delete; cascade on machine delete', async () => {
      await db.exec('reset role');
      const adminM = '00000000-0000-0000-0000-00000000000c';
      await db.query('insert into auth.users values ($1, $2)', [adminM, 'adminM@example.invalid']);
      await db.query("insert into public.portal_members (user_id, display_name, role, active) values ($1, 'Admin M', 'admin', true)", [adminM]);
      await asUser(adminM, 'aal2');
      const brandId = (await db.query('select id from public.brands order by name limit 1')).rows[0].id;
      const machineId = (await db.query("insert into public.machines (name, brand_id, model) values ('Scrubber 1', $1, 'walk_behind_scrubber') returning id", [brandId])).rows[0].id;
      // A staff technician (alice) submits a report.
      await asUser(alice, 'aal2');
      const reportId = (await db.query("insert into public.maintenance_reports (machine_id, model, maintenance_type, machine_status) values ($1, 'walk_behind_scrubber', 'preventive', 'operational') returning id", [machineId])).rows[0].id;
      assert.equal((await db.query('select * from public.maintenance_reports where machine_id = $1', [machineId])).rows.length, 1);
      // Staff CAN edit the report (update policy).
      await db.query("update public.maintenance_reports set work_performed = 'Greased bearings' where id = $1", [reportId]);
      assert.equal((await db.query('select work_performed from public.maintenance_reports where id = $1', [reportId])).rows[0].work_performed, 'Greased bearings');
      // Staff cannot delete: RLS blocks, 0 rows removed, no error.
      await db.query('delete from public.maintenance_reports where id = $1', [reportId]);
      assert.equal((await db.query('select * from public.maintenance_reports where id = $1', [reportId])).rows.length, 1);
      // Admin can delete.
      await asUser(adminM, 'aal2');
      await db.query('delete from public.maintenance_reports where id = $1', [reportId]);
      assert.equal((await db.query('select * from public.maintenance_reports where id = $1', [reportId])).rows.length, 0);
      // Deleting the machine cascades its reports.
      await db.query("insert into public.maintenance_reports (machine_id, model) values ($1, 'walk_behind_scrubber')", [machineId]);
      await db.query('delete from public.machines where id = $1', [machineId]);
      assert.equal((await db.query('select * from public.maintenance_reports where machine_id = $1', [machineId])).rows.length, 0);
      // Anonymous visitors cannot read reports.
      await asUser(null, null, 'anon');
      await assert.rejects(db.query('select * from public.maintenance_reports'), /permission denied/);
    });
    await t.test('report snapshots: technicians archive and read; only admins delete; cascade on machine delete', async () => {
      await db.exec('reset role');
      const adminS = '00000000-0000-0000-0000-00000000000d';
      await db.query('insert into auth.users values ($1, $2)', [adminS, 'adminS@example.invalid']);
      await db.query("insert into public.portal_members (user_id, display_name, role, active) values ($1, 'Admin S', 'admin', true)", [adminS]);
      await asUser(adminS, 'aal2');
      const brandId = (await db.query('select id from public.brands order by name limit 1')).rows[0].id;
      const machineId = (await db.query("insert into public.machines (name, brand_id, model) values ('Scrubber S', $1, 'walk_behind_scrubber') returning id", [brandId])).rows[0].id;
      // Staff technician archives a snapshot.
      await asUser(alice, 'aal2');
      const snapId = (await db.query("insert into public.maintenance_report_snapshots (machine_id, model, machine_status) values ($1, 'walk_behind_scrubber', 'operational') returning id", [machineId])).rows[0].id;
      assert.equal((await db.query('select * from public.maintenance_report_snapshots where machine_id = $1', [machineId])).rows.length, 1);
      // Staff can update the current report's version (re-saving the same report).
      await db.query("update public.maintenance_report_snapshots set machine_status = 'waiting_parts' where id = $1", [snapId]);
      assert.equal((await db.query('select machine_status from public.maintenance_report_snapshots where id = $1', [snapId])).rows[0].machine_status, 'waiting_parts');
      // Staff cannot delete a snapshot: RLS blocks, 0 rows removed, no error.
      await db.query('delete from public.maintenance_report_snapshots where id = $1', [snapId]);
      assert.equal((await db.query('select * from public.maintenance_report_snapshots where id = $1', [snapId])).rows.length, 1);
      // Admin can delete a snapshot.
      await asUser(adminS, 'aal2');
      await db.query('delete from public.maintenance_report_snapshots where id = $1', [snapId]);
      assert.equal((await db.query('select * from public.maintenance_report_snapshots where id = $1', [snapId])).rows.length, 0);
      // Deleting the machine cascades its snapshots.
      await db.query("insert into public.maintenance_report_snapshots (machine_id, model) values ($1, 'walk_behind_scrubber')", [machineId]);
      await db.query('delete from public.machines where id = $1', [machineId]);
      assert.equal((await db.query('select * from public.maintenance_report_snapshots where machine_id = $1', [machineId])).rows.length, 0);
      // Anonymous visitors cannot read snapshots.
      await asUser(null, null, 'anon');
      await assert.rejects(db.query('select * from public.maintenance_report_snapshots'), /permission denied/);
    });
    await t.test('deactivation blocks an already issued MFA identity on the next query', async () => {
      await db.exec('reset role');
      await db.query('update public.portal_members set active = false where user_id = $1', [alice]);
      await asUser(alice, 'aal2');
      assert.equal((await db.query('select * from public.brands')).rows.length, 0);
    });
  } finally { await db.close(); }
});
