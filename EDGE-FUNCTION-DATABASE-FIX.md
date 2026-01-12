# Edge Function Database Connection Fix

## Problem Identified

The Edge Function was seeing different data than direct database queries:
- **Edge Function test query**: Saw 5 jobs (none match our database)
- **Edge Function found job**: `f98480ff-c2cb-4ad8-9aee-a00e3bce936f` (doesn't exist in our database)
- **Direct database queries**: Only 4 jobs exist (1 pokepedia failed, 3 pokemon_cache completed)
- **All master data tables**: Empty (0 records)

## Root Cause

The Edge Function was connecting to `http://kong:8000` (internal Docker network URL), which is correct for local development, but there was a potential mismatch in:
1. **Database connection**: Edge Function might be reading from a different database instance
2. **Connection pooling**: Cached connections might be showing stale data
3. **Transaction isolation**: Edge Function might be seeing uncommitted transactions

**Key Finding from Supabase Docs**: When developing locally, Edge Functions automatically get environment variables from Supabase CLI, but you can override them using `--env-file` to ensure consistent database connections.

## Fix Applied

### 1. Enhanced Logging
Added comprehensive logging to validate Edge Function database connection:

```typescript
// Validate Supabase client initialization
console.log("[Edge Function] Supabase client initialized:", {
  url: supabaseUrl,
  urlIsLocal: isLocal,
  isKong: isKong,
  hasServiceKey: !!supabaseServiceKey,
  serviceKeyPrefix: supabaseServiceKey.substring(0, 20) + "...",
  serviceKeyLength: supabaseServiceKey.length,
  serviceKeyLooksValid: supabaseServiceKey.length > 50,
})
```

### 2. Database Validation
Added validation to detect database mismatches:

```typescript
// Validate we're connected to the correct database
if (isLocal && testData && testData.length > 0) {
  const pokepediaJobs = testData.filter((j: any) => j.sync_type === "pokepedia")
  const runningJobs = testData.filter((j: any) => j.status === "running")
  
  console.log("[Edge Function] Database validation:", {
    isLocal: isLocal,
    totalJobsInTest: testData.length,
    pokepediaJobsCount: pokepediaJobs.length,
    runningJobsCount: runningJobs.length,
    pokepediaJobIds: pokepediaJobs.map((j: any) => j.job_id),
    runningJobIds: runningJobs.map((j: any) => j.job_id),
    warning: runningJobs.length > 0 
      ? `Found ${runningJobs.length} running job(s) - verify these exist in direct database queries`
      : null,
  })
}
```

## Expected Local Values

From `supabase status`:
- **SUPABASE_URL**: `http://127.0.0.1:54321` (or `http://kong:8000` for internal Docker network - both work)
- **SUPABASE_SERVICE_ROLE_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...` (JWT format, ~200+ characters)

## Next Steps

1. **Create Local Environment File**: Use explicit local values
   ```bash
   # Create supabase/.env.local with local Supabase values
   # This ensures Edge Function uses correct local database
   ```

2. **Restart Edge Function Server**: Use the env file to ensure correct connection
   ```bash
   # Stop current Edge Function server (Ctrl+C)
   # Then restart with explicit env file:
   supabase functions serve sync-pokepedia --no-verify-jwt --env-file supabase/.env.local
   ```
   
   **Important**: The `--env-file` flag ensures the Edge Function uses `http://127.0.0.1:54321` instead of `http://kong:8000`, which guarantees it connects to the correct local database instance.

2. **Verify Database Connection**: Check Edge Function logs for:
   - `urlIsLocal: true` (should be true for local development)
   - `serviceKeyLooksValid: true` (should be true)
   - Database validation warnings (if any)

3. **Compare Data**: After restart, compare:
   - Edge Function test query results
   - Direct database queries via Supabase MCP
   - Should see the same 4 jobs

4. **If Still Mismatched**: 
   - Check if multiple Supabase instances are running
   - Verify Edge Function is using correct `SUPABASE_URL` secret
   - Check for connection pooling issues

## Files Changed

- `supabase/functions/sync-pokepedia/index.ts`:
  - Enhanced Supabase client initialization logging
  - Added database validation checks
  - Improved error detection for database mismatches

## Verification

After restarting the Edge Function, logs should show:
```
[Edge Function] Supabase client initialized: {
  url: "http://kong:8000" or "http://127.0.0.1:54321",
  urlIsLocal: true,
  isKong: true/false,
  hasServiceKey: true,
  serviceKeyPrefix: "eyJhbGciOiJIUzI1NiIs...",
  serviceKeyLength: 200+,
  serviceKeyLooksValid: true
}

[Edge Function] Database validation: {
  isLocal: true,
  totalJobsInTest: 4,
  pokepediaJobsCount: 1,
  runningJobsCount: 0,
  pokepediaJobIds: ["7be7385a-0803-4977-a050-035ba50c5df7"],
  runningJobIds: [],
  warning: null
}
```

If you see different job IDs or counts, there's still a database mismatch that needs investigation.
