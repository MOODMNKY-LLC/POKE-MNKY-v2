# Apply League Engine Migrations to Remote (when `db push` fails)

If `supabase db push` fails because the remote has migration versions that aren’t in your local `supabase/migrations` folder (or because reapplying from the start would conflict with existing schema), use this flow to apply **only** the 7 league-engine migrations and then align history.

## What was done already

1. **Repair** was run so the remote no longer treats the old (missing) migration versions as applied:
   ```bash
   supabase migration repair --status reverted 20250206000000 20260207031136 ... (etc.)
   ```
2. A normal **push** would then try to apply every local migration from the oldest; the first one failed because the remote schema already exists (e.g. `draft_pool` exists but columns differ).

## Option A: Apply the 7 league-engine migrations manually, then sync history

### Step 1: Apply the 7 migration files on the remote

In **Supabase Dashboard → SQL Editor**, run each of these files **in this order**, one after the other:

1. `supabase/migrations/20260228120000_create_pending_transactions.sql`
2. `supabase/migrations/20260228120001_create_team_roster_versions.sql`
3. `supabase/migrations/20260228120002_create_trade_block_entries.sql`
4. `supabase/migrations/20260228120003_create_league_trade_offers.sql`
5. `supabase/migrations/20260228120004_seed_roster_versions_function.sql`
6. `supabase/migrations/20260228120005_add_tera_to_draft_picks_and_window.sql`
7. `supabase/migrations/20260228120006_season_rules_and_pokemon_master_placeholder.sql`

Copy the contents of each file and run it in the SQL Editor.

### Step 2: Sync migration history so future `db push` is clean

Still in the SQL Editor, run the script:

- **`scripts/remote-sync-migration-history.sql`**

That script inserts all 123 local migration versions into `supabase_migrations.schema_migrations` with `ON CONFLICT (version) DO NOTHING`, so the remote “knows” all local migrations are already applied.

### Step 3: Verify

- Run `supabase migration list` (or check in the Dashboard) and confirm the 7 league-engine migrations appear as applied.
- Next time you add a new migration, `supabase db push` should only apply that new one.

## Option B: If your migration history table is different

If you see errors like `relation "supabase_migrations.schema_migrations" does not exist` or `column "name" does not exist`:

- Your project may use a different schema or table shape. Check in the Dashboard (Table Editor or SQL) what table tracks migrations and which columns it has.
- If the table is `public.schema_migrations` with only a `version` column, run the same `INSERT ... VALUES (...), (...), ... ON CONFLICT (version) DO NOTHING` from `remote-sync-migration-history.sql` but against that table (e.g. `public.schema_migrations`).

## Summary

| Step | Action |
|------|--------|
| 1 | Run the 7 league-engine migration SQL files in order in Supabase SQL Editor |
| 2 | Run `scripts/remote-sync-migration-history.sql` in SQL Editor |
| 3 | Use `supabase db push` only for new migrations going forward |
