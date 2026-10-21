# Bright portal

Employee portal for Bright Service Company SARL at **portal.brightlb.com**: machines with QR
codes, bilingual (Arabic/English) maintenance reports with PDF export and saved versions,
documents, inventory, brands and employee administration.

It is the application that ran on portal.tomatosky.com, moved to Bright's own Supabase project
and domain with the same architecture: Next.js App Router, React, TypeScript, Supabase SSR/Auth
and PostgreSQL with row-level security, hosted on Netlify, with email through Resend. The
public website brightlb.com is a separate static site in the parent folder (`../src`, built to
`../site`), a separate Netlify site.

## Run

Node.js 22 or newer. `npm install`, copy `.env.example` to `.env.local` and fill in the Bright
Supabase project's values, then `npm run dev` (http://127.0.0.1:3000).

- `/` goes to `/portal`.
- `/login`: employee password sign-in. No registration.
- `/auth/mfa`: approved employees enroll or verify an authenticator.
- `/auth/forgot-password`, `/auth/confirm`, `/auth/callback`, `/auth/recovery-error`,
  `/auth/update-password`: password recovery (works across browsers).
- `/portal`: requires a verified Supabase identity, an active membership (admin or staff) and
  MFA. Sections: Overview, Inventory, Documents, Reports, Administration (admin only).
- `/m/<machine id>`: the page a machine's QR code opens (sign-in and MFA required).

## Setup

Follow [docs/supabase-setup.md](docs/supabase-setup.md): create the Supabase project, apply
`supabase/migrations/202610210001_bright_portal_schema.sql`, configure Auth, move the data from
portal.tomatosky.com, and deploy on Netlify with Base directory `portal` (`netlify.toml`).
Root `npm run dev` in the parent folder runs the website and this portal together on
http://127.0.0.1:3000.

## Verify

- `npm run build`
- `npm run test:schema` (schema identical to the original TomatoSky portal)
- `npm run test:access` (every grant and RLS rule, in local PostgreSQL)
- `npm run test:recovery`
- `npm run check:supabase` (live, read-only)

Security model, unchanged from TomatoSky: nothing is readable without a signed-in employee
with an active membership and a verified authenticator; the server re-checks membership on
every request; the service-role key is server-only and used only for employee administration.
