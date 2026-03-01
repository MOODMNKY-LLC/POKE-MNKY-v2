# Stock Showdown Teams – Locate and Populate

Stock teams are preloaded Showdown-format teams visible to all authenticated users. They appear in the **Team Library** and on the **Dashboard → Teams** page so new users can browse and copy them.

## Where stock teams live

| Location | Purpose |
|----------|---------|
| **Seed file** | [supabase/seeds/seed_showdown_stock_teams.sql](../supabase/seeds/seed_showdown_stock_teams.sql) – Defines 5 stock teams (OU Stall, OU Hyper Offense, UU Balance, VGC Sample, LC Mono Fire). Idempotent: only inserts if a team with the same `team_name` + `generation` + `format` does not exist. |
| **Migration** | [supabase/migrations/20260115000002_add_stock_teams_flag.sql](../supabase/migrations/20260115000002_add_stock_teams_flag.sql) – Adds `is_stock BOOLEAN DEFAULT FALSE` to `showdown_teams` and RLS so authenticated users can view rows with `is_stock = true`. |
| **Table** | `public.showdown_teams` – Stock rows have `is_stock = true` and typically `coach_id = NULL`. |
| **App** | Dashboard Teams ([app/dashboard/teams/page.tsx](../app/dashboard/teams/page.tsx)), Team Library ([app/dashboard/teams/library/page.tsx](../app/dashboard/teams/library/page.tsx)), **Team detail** ([app/dashboard/teams/[id]/page.tsx](../app/dashboard/teams/[id]/page.tsx) – `/dashboard/teams/:id`), Showdown Team Library ([app/showdown/team-library/page.tsx](../app/showdown/team-library/page.tsx)), and API [GET /api/showdown/teams](app/api/showdown/teams/route.ts) (includes stock by default). |
| **Debug** | [GET /api/debug/stock-teams](app/api/debug/stock-teams/route.ts) – Returns stock team count and sample (authenticated). |

**Sourcing:** Stock teams are stored in `public.showdown_teams` with `is_stock = true` and `source = 'seed'`. They are populated from [supabase/seeds/seed_showdown_stock_teams.sql](../supabase/seeds/seed_showdown_stock_teams.sql) (via `npm run db:seed:showdown`, `npm run db:seed:showdown:ts`, Supabase Dashboard SQL Editor, or **Supabase local MCP** `execute_sql`). The dashboard Team Library and team detail page read from the same table; the detail page uses `getTeamById(id)` and allows access for the team owner or any authenticated user when the team is a stock team.

## How to populate stock teams

You need to run the seed SQL against your Postgres database once (e.g. after migrations). Use either of the following.

### Option 1: npm script (requires `psql` and `POSTGRES_URL`)

```bash
# Set your Postgres connection string (Supabase: Project Settings → Database → Connection string → URI)
export POSTGRES_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

npm run db:seed:showdown
```

On Windows (PowerShell) you can set the env and run in one go:

```powershell
$env:POSTGRES_URL = "postgresql://postgres:YOUR-PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres"
npm run db:seed:showdown
```

### Option 2: Node script (no `psql` required)

Uses the `pg` package and the same seed file. Requires `POSTGRES_URL` in `.env` or `.env.local`.

```bash
pnpm exec tsx scripts/seed-stock-teams.ts
# or
npm run db:seed:showdown:ts
```

**Self-signed certificate error:** If you see `SELF_SIGNED_CERT_IN_CHAIN`, the script allows self-signed certs when `NODE_ENV` is not `production`. If you run with `NODE_ENV=production`, set `PGSSL_REJECT_UNAUTHORIZED=false` for the run (e.g. `PGSSL_REJECT_UNAUTHORIZED=false npm run db:seed:showdown:ts`). Use only for development or trusted DBs.

Add to `.env` or `.env.local`:

```env
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Get the URI from Supabase: **Project Settings → Database → Connection string → URI**.

### Option 3: Supabase Dashboard

1. Open your project on [supabase.com](https://supabase.com).
2. Go to **SQL Editor**.
3. Paste the contents of [supabase/seeds/seed_showdown_stock_teams.sql](../supabase/seeds/seed_showdown_stock_teams.sql).
4. Run the query.

## Verify

- **In app**: Log in, go to **Dashboard → Teams** or **Dashboard → Team Library**. You should see stock teams (e.g. “Stock OU Stall”) with a “Stock” badge.
- **Debug endpoint**: While logged in, open `/api/debug/stock-teams` in the browser. The response should show `stockTeams.count` ≥ 1 (typically 5 after a fresh seed).

## Troubleshooting: Team Library shows 0 teams

If you ran the seed successfully (e.g. “Stock teams in database: 57”) but the Team Library still shows “Found 0 stock teams”, the app is almost certainly using a **different Supabase project** than the one you seeded.

1. **Check which DB the app uses**  
   While logged in, open **Debug Query** on the Team Library page (or go to `/api/debug/stock-teams`). In the JSON response, note `appDatabase` (the hostname, e.g. `db.xxxx.supabase.co` or your project ref).

2. **Use the same project for the seed**  
   Your seed script uses `POSTGRES_URL`; the app uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. They must point to the **same** project.  
   - In Supabase Dashboard, open the project that matches `NEXT_PUBLIC_SUPABASE_URL`.  
   - Go to **Project Settings → Database** and copy the **Connection string (URI)**.  
   - Set that as `POSTGRES_URL` in `.env` or `.env.local` and run the seed again:  
     `npm run db:seed:showdown:ts` (or `npm run db:seed:showdown` with `psql`).

3. **Restart the dev server**  
   After changing env or re-seeding, restart `pnpm dev` (or `npm run dev`) so the app picks up the same project and fresh data.

## Notes

- Seed is **idempotent**: safe to run multiple times; it will not duplicate teams.
- Run against **development** (or a dedicated environment) only; do not seed production unless intended.
- To add or change stock teams, edit [supabase/seeds/seed_showdown_stock_teams.sql](../supabase/seeds/seed_showdown_stock_teams.sql) and re-run one of the populate options above.
