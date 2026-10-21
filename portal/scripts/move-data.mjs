// One-off move of the portal data from the TomatoSky Supabase project (portal.tomatosky.com)
// to the Bright project (portal.brightlb.com). Both databases must have the same schema
// (supabase/migrations, proven by `npm run test:schema`).
//
//   npm run move-data            dry run: compares columns and counts rows, writes nothing
//   npm run move-data -- --apply copies everything in ONE transaction on the Bright database
//
// Reads OLD_DB_URL and NEW_DB_URL (Session pooler connection strings, with passwords) from
// .env.migration, which is git-ignored. Optional DB_CA_FILE: Supabase's SSL certificate
// (Project Settings → Database) to verify the server certificate. Prints no secrets.
//
// Employee accounts keep their IDs, so every membership and "created by" link stays intact,
// and passwords keep working. Authenticator (MFA) factors are copied too.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
// Parents before children; session_replication_role = replica also relaxes ordering.
const TABLES = [
  ['auth', 'users'], ['auth', 'identities'], ['auth', 'mfa_factors'],
  ['public', 'brands'], ['public', 'portal_members'], ['public', 'portal_folders'],
  ['public', 'stock_locations'], ['public', 'products'], ['public', 'stock_movements'],
  ['public', 'machines'], ['public', 'maintenance_report_snapshots'], ['public', 'maintenance_reports'],
];

for (const name of ['OLD_DB_URL', 'NEW_DB_URL']) {
  if (!process.env[name]) { console.error(`Missing ${name} in .env.migration`); process.exit(1); }
}
const host = url => new URL(url).host;
if (host(process.env.OLD_DB_URL) === host(process.env.NEW_DB_URL) && new URL(process.env.OLD_DB_URL).username === new URL(process.env.NEW_DB_URL).username) {
  console.error('OLD_DB_URL and NEW_DB_URL point to the same database.'); process.exit(1);
}
const ssl = process.env.DB_CA_FILE ? { ca: readFileSync(process.env.DB_CA_FILE, 'utf8') } : { rejectUnauthorized: false };
const connect = async url => { const client = new pg.Client({ connectionString: url, ssl }); await client.connect(); return client; };

const columnsOf = async (db, schema, table) => (await db.query(
  `select column_name from information_schema.columns
   where table_schema = $1 and table_name = $2 and is_generated = 'NEVER' and is_identity = 'NO'
   order by ordinal_position`, [schema, table])).rows.map(r => r.column_name);
const count = async (db, schema, table) => Number((await db.query(`select count(*) from "${schema}"."${table}"`)).rows[0].count);

const source = await connect(process.env.OLD_DB_URL);
const target = await connect(process.env.NEW_DB_URL);
try {
  const plan = [];
  let problems = 0;
  console.log(`From ${host(process.env.OLD_DB_URL)} (TomatoSky) to ${host(process.env.NEW_DB_URL)} (Bright)\n`);
  for (const [schema, table] of TABLES) {
    const [from, to] = await Promise.all([columnsOf(source, schema, table), columnsOf(target, schema, table)]);
    const shared = from.filter(column => to.includes(column));
    const onlyOld = from.filter(column => !to.includes(column));
    const [rows, existing] = await Promise.all([count(source, schema, table), count(target, schema, table)]);
    let note = '';
    if (schema === 'public' && (onlyOld.length || to.some(column => !from.includes(column)))) { note = '  SCHEMA DIFFERS'; problems++; }
    else if (onlyOld.length) note = `  (old-only columns skipped: ${onlyOld.join(', ')})`;
    if (existing > 0) { note += `  TARGET NOT EMPTY (${existing} rows)`; problems++; }
    console.log(`${`${schema}.${table}`.padEnd(38)} ${String(rows).padStart(6)} rows${note}`);
    plan.push({ schema, table, columns: shared, rows });
  }
  if (problems) { console.log('\nStopped: fix the problems above first. Nothing was written.'); process.exitCode = 1; }
  else if (!APPLY) console.log('\nDry run only, nothing was written. Run with --apply to copy.');
  else {
    await target.query('begin');
    await target.query('set local session_replication_role = replica');
    for (const { schema, table, columns } of plan) {
      const list = columns.map(c => `"${c}"`).join(', ');
      const json = (await source.query(`select coalesce(json_agg(t), '[]') as rows from (select ${list} from "${schema}"."${table}") t`)).rows[0].rows;
      for (let i = 0; i < json.length; i += 500) {
        await target.query(`insert into "${schema}"."${table}" (${list}) select ${list} from json_populate_recordset(null::"${schema}"."${table}", $1::json)`,
          [JSON.stringify(json.slice(i, i + 500))]);
      }
    }
    // Every table must now hold exactly what the old database holds, or nothing is kept.
    for (const { schema, table, rows } of plan) {
      const copied = await count(target, schema, table);
      if (copied !== rows) throw new Error(`${schema}.${table}: copied ${copied} of ${rows} rows`);
    }
    await target.query('commit');
    console.log('\nCopied and verified: every table matches the old database.');
  }
} catch (error) {
  await target.query('rollback').catch(() => {});
  console.error('\nFailed, nothing was kept:', error.message);
  process.exitCode = 1;
} finally {
  await Promise.all([source.end(), target.end()]);
}
