# Set up the Bright portal (portal.brightlb.com)

The portal is the same application and database design that ran on portal.tomatosky.com,
moved to Bright's own Supabase project and domain. Do the steps in order.

## 1. Create the Supabase project

In the Supabase dashboard create a new project, e.g. **bright-portal**, in a region close to
Lebanon (e.g. Central EU, Frankfurt). Keep the database password in your password manager.

From **Project Settings → API** you need the **Project URL** and the **publishable key**
(for the app), and the **service-role / secret key** (server-only, for employee administration).

## 2. Apply the schema

In the project's **SQL Editor**, create a new query, paste the complete contents of
`supabase/migrations/202610210001_bright_portal_schema.sql`, and run it **once**.

It creates every portal table (employees, brands, folders, inventory, machines, maintenance
reports and their saved versions), the security functions, and the row-level security rules.
It adds no data. `npm run test:schema` proves it is identical to the final state of the
TomatoSky migrations kept for reference in `supabase/history/` (never run those).

Future changes go in new, dated files in `supabase/migrations/`, applied the same way.

## 3. Configure authentication

**Authentication → Sign In / Providers:**
- Disable **Allow new users to sign up** (employees are invited, never self-registered).
- Keep email/password enabled; disable anonymous sign-in and social providers.
- Keep email confirmation enabled.

**Authentication → Multi-Factor:** enable authenticator (TOTP) enrollment and verification.
The portal admits nobody without a verified authenticator.

**Authentication → URL Configuration:**
- Site URL: `https://portal.brightlb.com` (no trailing slash).
- Redirect URLs: `https://portal.brightlb.com/auth/callback`, plus
  `http://127.0.0.1:3000/auth/callback` for local development.

**Email sending through Resend (needed for invitations and password recovery):** Supabase's
built-in sender only reaches the project team and allows about two emails per hour.

1. **Resend → Domains → Add domain:** `brightlb.com`. Resend lists DNS records: a DKIM `TXT`
   at `resend._domainkey`, and an `MX` plus an SPF `TXT` at `send` (the bounce subdomain). Add
   them in **Cloudflare DNS** (DNS only, or use Resend's Cloudflare auto-configure), then click
   **Verify**. They do not touch the root `MX` and SPF, so Google Workspace mail is unaffected.
2. In the domain's settings, turn **click tracking** and **open tracking** off: rewritten links
   break the one-time sign-in links.
3. **Resend → API Keys → Create:** name `supabase-bright-portal`, permission **Sending
   access**, domain `brightlb.com`. Copy it once, straight into the next step.
4. **Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP:**
   - Sender email `contact@brightlb.com` (a real Google Group, so replies reach the team),
     sender name `Bright Portal`
   - Host `smtp.resend.com`, port `465`, username `resend`, password: the Resend API key
5. **Authentication → Rate Limits:** raise "emails per hour" (default 2 with the built-in
   sender) to e.g. 30.
6. Test with **Forgot password** on the login page; the email arrives from Bright Portal.
   **Resend → Emails** shows every message and its delivery status.

Optionally apply `supabase/templates/reset-password.html` as the Reset Password template
(see section 7).

## 4. Moving the data from portal.tomatosky.com

Do this **before** creating any account in the new project, so nothing collides.

The data includes the employee accounts (`auth` schema: users, identities and authenticator
factors) and all portal tables. Keeping the same user IDs keeps every "created by", "saved by"
and membership link intact, and employees keep their password and authenticator app.

Use `npm run move-data` (`scripts/move-data.mjs`; no Supabase CLI or psql needed):

1. Fill in `.env.migration` (git-ignored) with both projects' **Session pooler** connection
   strings (Project Settings → Database → Connect → Session pooler), password included.
2. `npm run move-data`: dry run. Compares both schemas column by column and counts the rows
   to copy. Writes nothing. Stops if the Bright database already has data.
3. `npm run move-data -- --apply`: copies employee accounts (users, identities, authenticator
   factors) and every portal table in ONE transaction, with `session_replication_role =
   replica` so rows load in any order, then checks every table's count against the old
   database. Any failure rolls everything back.

Then check in the new project's SQL Editor that the row counts match the old project:

```sql
select 'members' as t, count(*) from public.portal_members union all
select 'brands', count(*) from public.brands union all
select 'machines', count(*) from public.machines union all
select 'reports', count(*) from public.maintenance_reports union all
select 'report versions', count(*) from public.maintenance_report_snapshots union all
select 'folders', count(*) from public.portal_folders union all
select 'products', count(*) from public.products union all
select 'stock movements', count(*) from public.stock_movements;
```

Afterwards, delete `.env.migration` (it holds both database passwords).

Notes:
- Authenticator apps keep working; the entry is still labelled "TomatoSky" until an employee
  re-enrolls. New enrollments are labelled "Bright Service".
- Machine QR codes encode `https://portal.tomatosky.com/m/<machine id>`. The move keeps
  machine IDs, so printed stickers keep working as long as portal.tomatosky.com redirects
  with the path kept (section 6, step 5). New QR codes use portal.brightlb.com; reprint the
  stickers when convenient.
- After the move, the old project can be paused, then deleted once everything is confirmed.

## 5. First administrator (only if you are NOT moving data)

For a fresh start without the TomatoSky data: in **Authentication → Users → Add user →
Create new user**, create your own account with a strong password chosen privately, and
auto-confirm the email. Then open `supabase/enable-first-admin.sql`, replace
`REPLACE_WITH_YOUR_EMAIL` and `REPLACE_WITH_YOUR_NAME`, and run it in the SQL Editor.
`supabase/diagnose-admin.sql` checks an account's status (it prints no secrets).

An Auth account alone gives no access: an active row in `portal_members` is required, and
nobody can grant that to themselves.

## 6. Deploy on Netlify at portal.brightlb.com

The portal is a second Netlify site from the same repository, next to the public site
(brightlb.com, which publishes only `site/`). Netlify runs Next.js through its OpenNext
adapter, installed automatically; `netlify.toml` in this folder holds the build settings.

1. **Netlify → Add new project → Import an existing project → GitHub**, choose
   `bright-venture/Bright`. Set **Base directory** to `portal`; the build command
   (`npm run build`) and publish directory (`.next`) come from `portal/netlify.toml`.
   Project name e.g. `bright-portal`.
2. **Environment variables** (before the first deploy; Site configuration → Environment
   variables), all scopes, same value in every context:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new project)
   - `NEXT_PUBLIC_SITE_URL` = `https://portal.brightlb.com`
   - `SUPABASE_SERVICE_ROLE_KEY`: tick **Contains secret values** (server-only; never prefix
     it with `NEXT_PUBLIC_`)
3. **Domain management → Add a domain:** `portal.brightlb.com`. In **Cloudflare DNS** add a
   `CNAME` named `portal` pointing to the project's `<name>.netlify.app` address, proxy **off**
   (grey cloud) so Netlify can issue the HTTPS certificate. Wait for Netlify to show HTTPS.
4. Builds: with a base directory set, Netlify skips portal builds when a push changes nothing
   in `portal/`. Website pushes still redeploy brightlb.com as before.
5. Retiring portal.tomatosky.com (still on Vercel): once the new portal works and the data is
   moved, open the TomatoSky Vercel project → **Settings → Domains**, edit
   `portal.tomatosky.com` and set it to **Redirect to** `portal.brightlb.com` (301). Vercel
   keeps the path, so a printed QR code for `portal.tomatosky.com/m/<id>` opens
   `portal.brightlb.com/m/<id>`. No TomatoSky code changes.

## 7. Recovery, MFA and offboarding (unchanged from TomatoSky)

Employees request email recovery at `/auth/forgot-password`. The default Supabase email opens
`/auth/callback`; the optional custom template opens `/auth/confirm` (consumed only after the
confirmation button, so email scanners cannot invalidate it). Both establish a verified session
before `/auth/update-password`, which requires an approved employee and challenges any existing
authenticator. Successful updates sign out other sessions.

There is no app-based MFA bypass: a trusted administrator handles lost authenticators after
verifying the employee's identity.

To revoke access immediately, deactivate the employee in the portal's Administration section
(or set `portal_members.active = false`); membership is rechecked on every request and query.

The Administration console (invite, activate/deactivate, change roles) uses the service-role
key inside admin-only server actions. An admin cannot deactivate or demote themselves, and the
last active admin cannot be removed.

## Verification

- `npm run build`: production compilation and TypeScript.
- `npm run test:schema`: the Bright schema equals the original TomatoSky schema.
- `npm run test:access`: local PostgreSQL tests of every grant and RLS rule.
- `npm run test:recovery`: recovery-link and password-update flows with mocked Auth.
- `npm run check:supabase`: read-only check of the live project (prints no credentials).

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp).
