# Supabase DB Reset Troubleshooting

## WARN: no files matched pattern: supabase/seed.sql

**Fix:** Ensure `supabase/seed.sql` exists. An empty file is valid. The project includes a minimal `supabase/seed.sql` for local development.

## Error status 502: An invalid response was received from the upstream server

This occurs during "Restarting containers..." when Kong cannot reach the Storage service. Common causes:

- **Project ID with hyphens/uppercase** (e.g. `POKE-MNKY-v2`) causes Docker Compose to append a suffix to container names, breaking Kong's routing.
- **Docker container state** – containers may be in an inconsistent state after a previous run.

### Workarounds

**1. Fix project_id in config (recommended, permanent fix)**

`supabase/config.toml` uses `project_id` for Docker Compose. Use a lowercase, underscore-only name:

```toml
project_id = "poke_mnky"
```

Then restart Supabase so it uses the new project name:

```bash
supabase stop --no-backup
supabase start
supabase db reset
```

**2. Tolerate 502 (database is usable despite error)**

Migrations and seed complete before the 502. Use a script that treats 502 as success:

```bash
pnpm db:reset:tolerate-502
```

**3. Database-only reset (temporary workaround)**

If you still hit 502, try bypassing Storage and other services:

```bash
pnpm db:reset:safe
```

Or directly:

```bash
SUPABASE_DB_ONLY=true supabase db reset
```

*Note: `SUPABASE_DB_ONLY` may not work on all platforms; use `db:reset:tolerate-502` if it fails.*

**4. Full reset after clean restart**

```bash
supabase stop --no-backup
supabase start
supabase db reset
```

**5. Upgrade Supabase CLI** (Scoop: `scoop update supabase`; npm: `npm update -g supabase`)

Some users report the issue is fixed in newer CLI versions:

```bash
scoop update supabase
# or: npm update -g supabase
```

### Local vs linked reset

- `supabase db reset` – resets **local** database only.
- `supabase db reset --linked` – resets the **remote** linked project's database. The 502 may occur when the remote API is unreachable or rate-limited.

For local development, use `pnpm db:reset` or `pnpm db:reset:safe` (if you hit 502).
