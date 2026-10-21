@AGENTS.md

# Bright portal

Employee portal at portal.brightlb.com (Next.js 16 + Supabase, a second Netlify site with Base directory `portal`, see `netlify.toml`; email through Resend SMTP). Moved from the TomatoSky repo (`bright-venture/TomatoSky`, portal.tomatosky.com) in Oct 2026 with the same architecture; do not change the TomatoSky repo from here. See README.md and docs/supabase-setup.md.

- Database: `supabase/migrations/` holds Bright's schema (one consolidated file, then new dated files for future changes, applied by hand in the Supabase SQL Editor). `supabase/history/` keeps the original TomatoSky migrations for reference only; `npm run test:schema` proves the consolidated schema equals them. Every new table needs RLS gated by `has_portal_access()` / `has_admin_access()`, explicit grants, and tests in `scripts/test-access.mjs`.
- Every server mutation calls `requireEmployee()` (or `requireAdmin()`) and validates its input. Never use the service-role key outside admin-only server actions, never in `NEXT_PUBLIC_*`.
- Branding: Bright navy `#0b2038` (`--ink`), blue `#006bd6` (`--accent`), Arial. Status colours (green running/ok, red down/delete, amber maintenance, blue changed) are semantic: keep them.
- Report templates and the bilingual PDF follow Bright Service's Arabic/English paper forms (`src/lib/portal/maintenance-templates.ts`, `report-pdf.ts`).
- Same conventions as the website: no em dashes in user-facing text; even, complete grids.
