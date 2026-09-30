# Be Right — home maintenance, Lebanon

Specialist-led home repair web app: customers answer guided questions and upload photos/video,
a specialist reviews urgency and sends a quote, the customer approves, a technician is assigned
and reports progress (with live location) until the job is closed. English + Arabic (RTL).

Ported from the Kimi prototype onto Supabase (Postgres, Auth, Storage), per the architecture study.

## Stack

- **Frontend:** React 19, Vite, Tailwind, shadcn/ui, React Router, tRPC + React Query
- **Backend:** Hono + tRPC on Node (`api/`), Drizzle ORM (`db/`)
- **Supabase:** Postgres database, email sign-in (magic link / code, optional Google), private Storage bucket for media
- Shared domain logic (service categories, question trees, urgency engine, strings) lives in `contracts/`

## Roles

| Role | How they get it | Where they work |
| --- | --- | --- |
| Customer | Any signed-in user | `/book`, `/requests` |
| Specialist (admin) | Email listed in `ADMIN_EMAILS` (applied on next sign-in) | `/dashboard` |
| Technician | A specialist adds their email in the dashboard (they must sign in once first) | `/tech` |

Technician applications from `/join` need no account and appear in the dashboard.

## Setup

1. **Create a Supabase project** (region close to Lebanon, e.g. Frankfurt `eu-central-1`).
2. **Configure env:** `cp .env.example .env` and fill in the values from
   *Project Settings → API* and *Project Settings → Database → Connection string*.
3. **Install and create the schema:**
   ```bash
   npm install
   npm run db:migrate
   ```
4. **Configure Supabase Auth** (*Authentication → URL Configuration*):
   - Site URL: your production URL (e.g. `https://brightlb.com`)
   - Redirect URLs: `http://localhost:3000/**` and `https://brightlb.com/**`
   - Optional: in *Email Templates → Magic Link*, add `{{ .Token }}` so users can type the code
     instead of clicking the link (useful when the email opens in a different browser).
   - For production volume, set up custom SMTP (*Authentication → SMTP*); the built-in sender is rate-limited.
   - Optional Google sign-in: enable the provider, then set `VITE_AUTH_GOOGLE=true`.
5. **Run locally:** `npm run dev` → http://localhost:3000

The storage bucket (`request-media`, private, 20 MB, images/videos only) is created automatically on first upload.

## Deploy

Any Node 20+ host works. With Docker:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... \
  -t be-right .
docker run -p 3000:3000 --env-file .env be-right
```

Without Docker: `npm ci && npm run build && NODE_ENV=production npm start`
(the `VITE_*` variables must be present at build time).

Runtime env needed on the server: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`ADMIN_EMAILS` (and optionally `SUPABASE_STORAGE_BUCKET`, `PORT`). Health check: `GET /api/health`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the API mounted at `/api` |
| `npm run build` | Builds the SPA to `dist/public` and bundles the server to `dist/boot.js` |
| `npm start` | Runs the built server (set `NODE_ENV=production`) |
| `npm run check` | TypeScript type-check |
| `npm test` | Unit tests (urgency engine) |
| `npm run db:generate` | Generate a migration after editing `db/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `DIRECT_DATABASE_URL` if set) |

## Security notes

- All tables have Row Level Security enabled with no policies: the browser's publishable key cannot
  read or write them through Supabase's REST API. Only the app server (direct Postgres connection) can.
- The service-role key is server-only. Never prefix it with `VITE_`.
- Uploads go directly to Storage through one-time signed URLs under `requests/<user-id>/`; the server
  rejects requests that reference another user's files, and media is served through short-lived signed URLs.
