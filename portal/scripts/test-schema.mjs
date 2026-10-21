import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Proves the consolidated Bright schema (supabase/migrations) is identical to the final
// state of the original portal.tomatosky.com migrations (supabase/history), so data can
// be moved between the two databases unchanged. Runs in isolated in-memory PostgreSQL.
const SUPABASE_STUB = `
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
`;

async function database(folder) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = new URL(`../supabase/${folder}/`, import.meta.url);
  for (const file of (await readdir(dir)).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, dir), 'utf8'));
  }
  return db;
}

// Everything that defines the schema's shape and its security, in a stable order.
const CATALOG = {
  columns: `select table_name, column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
            from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`,
  constraints: `select conrelid::regclass::text as tbl, conname, pg_get_constraintdef(oid) as def
                from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`,
  indexes: `select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2`,
  rls: `select relname, relrowsecurity, relforcerowsecurity from pg_class
        where relnamespace = 'public'::regnamespace and relkind in ('r', 'v') order by 1`,
  policies: `select tablename, policyname, permissive, roles::text, cmd, qual, with_check
             from pg_policies where schemaname = 'public' order by 1, 2`,
  grants: `select table_name, grantee, privilege_type from information_schema.role_table_grants
           where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC') order by 1, 2, 3`,
  functions: `select p.proname, pg_get_functiondef(p.oid) as def, p.proacl::text as acl from pg_proc p
              where p.pronamespace = 'public'::regnamespace order by 1`,
  views: `select viewname, definition from pg_views where schemaname = 'public' order by 1`,
};

test('Bright schema matches the final TomatoSky portal schema', async t => {
  const [original, bright] = await Promise.all([database('history'), database('migrations')]);
  try {
    for (const [name, sql] of Object.entries(CATALOG)) {
      await t.test(name, async () => {
        const [a, b] = await Promise.all([original.query(sql), bright.query(sql)]);
        assert.ok(a.rows.length > 0, `no ${name} found`);
        assert.deepEqual(b.rows, a.rows);
      });
    }
    await t.test('the Bright schema seeds no data', async () => {
      assert.equal((await bright.query('select count(*)::int as n from public.brands')).rows[0].n, 0);
    });
  } finally {
    await Promise.all([original.close(), bright.close()]);
  }
});
