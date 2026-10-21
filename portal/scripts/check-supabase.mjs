// Read-only diagnostic. Never prints API keys, cookies, passwords, or tokens.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing Supabase environment configuration.');
const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
console.log('Authentication endpoint:', settings.status);
if (!settings.ok) process.exit(1);
const config = await settings.json();
console.log('Email authentication enabled:', config.external?.email);
console.log('Public signup disabled:', config.disable_signup);
const members = await fetch(`${url}/rest/v1/portal_members?select=user_id&limit=0`, { headers: { apikey: key } });
const result = await members.json();
console.log('Anonymous membership request:', members.status, result.code ?? 'response received');
if (result.code === 'PGRST205') console.log('Next action: run the portal foundation SQL in the Supabase SQL Editor.');
else if (members.status === 401 || members.status === 403) console.log('Anonymous membership access is blocked.');
else { console.log('Check table grants and RLS before admitting employees.'); process.exitCode = 1; }
