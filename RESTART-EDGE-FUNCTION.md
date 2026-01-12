# Restart Edge Function with Correct Environment

## Critical Issue Confirmed

The Edge Function is connecting to a **different database instance** than what we're querying directly:

- **Edge Function sees**: 5 pokepedia jobs (none exist in our database)
- **Edge Function sees**: Running job `b69fc727-3200-4be9-99ac-639cce7d82d2` (doesn't exist)
- **Our database has**: Only 1 pokepedia job (failed), 3 pokemon_cache jobs

## Solution

Restart the Edge Function server with the explicit environment file:

```bash
# Stop current Edge Function server (Ctrl+C in the terminal where it's running)

# Then restart (env file at supabase/functions/.env is automatically loaded):
supabase functions serve sync-pokepedia --no-verify-jwt

# OR use explicit env file path:
supabase functions serve sync-pokepedia --no-verify-jwt --env-file .env.local
# (Note: --env-file path is relative to supabase/functions/ directory)
```

## What This Does

The `.env` file at `supabase/functions/.env` is automatically loaded, ensuring:
- `SUPABASE_URL=http://127.0.0.1:54321` (explicit localhost)
- `SUPABASE_SERVICE_ROLE_KEY` (local service role key)
- Connects to the **correct local database instance**

## Verification After Restart

After restarting, check Edge Function logs for:

```
[Edge Function] Supabase client initialized: {
  url: "http://127.0.0.1:54321",  // ✅ Should be localhost, not kong:8000
  urlIsLocal: true,
  isKong: false,  // ✅ Should be false
  ...
}

[Edge Function] Database validation: {
  totalJobsInTest: 4,  // ✅ Should match our database (1 pokepedia + 3 pokemon_cache)
  pokepediaJobsCount: 1,  // ✅ Should be 1, not 5
  pokepediaJobIds: ["7be7385a-0803-4977-a050-035ba50c5df7"],  // ✅ Should match
  runningJobsCount: 0,  // ✅ Should be 0
  ...
}
```

If the job counts and IDs match after restart, the database connection is fixed!
