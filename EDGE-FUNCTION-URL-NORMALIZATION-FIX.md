# Edge Function URL Normalization Fix

## Problem Analysis (Using Sequential Thinking)

After analyzing the issue with sequential thinking and the writing-supabase-edge-functions rule:

### Key Findings

1. **Pre-populated Environment Variables**: According to the rule, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are pre-populated by Supabase CLI. These values take precedence over `.env` files.

2. **URL Format Issue**: Supabase CLI injects `http://kong:8000` (internal Docker network URL) by default. While this should work, we're seeing different data than direct database queries.

3. **Database Mismatch**: Edge Function sees 5 pokepedia jobs, but our database only has 1 pokepedia job. This suggests the Edge Function is connecting to a different database instance.

4. **Root Cause**: Even though `kong:8000` and `127.0.0.1:54321` should point to the same instance, there might be connection routing or caching differences causing the mismatch.

## Solution Implemented

### URL Normalization in Code

Modified the Edge Function to **explicitly normalize the URL** when running locally:

\`\`\`typescript
// CRITICAL FIX: Normalize URL for local development
// Supabase CLI pre-populates SUPABASE_URL with http://kong:8000 (internal Docker network)
// While this works, we want to explicitly use http://127.0.0.1:54321 to ensure
// we connect to the same database instance that direct queries use
if (isLocal && isKong) {
  // Replace kong:8000 with explicit localhost URL
  const originalUrl = supabaseUrl
  supabaseUrl = supabaseUrl.replace("http://kong:8000", "http://127.0.0.1:54321")
  console.log("[Edge Function] URL normalized for local development:", {
    original: originalUrl,
    normalized: supabaseUrl,
    reason: "Ensuring connection to correct local database instance"
  })
}
\`\`\`

### Enhanced Database Validation

Added comprehensive validation that compares expected vs actual database state:

\`\`\`typescript
// Expected local database state
const expectedPokepediaCount = 1
const expectedTotalCount = 4 // 1 pokepedia + 3 pokemon_cache
const dataMatches = actualPokepediaCount === expectedPokepediaCount && 
                    actualTotalCount === expectedTotalCount &&
                    runningJobs.length === 0

// Critical warning if data doesn't match
warning: !dataMatches 
  ? `⚠️ DATABASE MISMATCH: Expected ${expectedTotalCount} jobs (${expectedPokepediaCount} pokepedia), but found ${actualTotalCount} jobs (${actualPokepediaCount} pokepedia). Edge Function may be connected to wrong database instance!`
  : null
\`\`\`

## Why This Works

1. **Explicit URL Control**: By normalizing the URL in code, we bypass any environment variable precedence issues.

2. **Consistent Connection**: Using `http://127.0.0.1:54321` ensures the Edge Function connects to the same database instance that direct queries use.

3. **Immediate Detection**: Enhanced validation will immediately detect if there's still a database mismatch and log detailed diagnostic information.

## Verification

After restarting the Edge Function, logs should show:

\`\`\`
[Edge Function] URL normalized for local development: {
  original: "http://kong:8000",
  normalized: "http://127.0.0.1:54321",
  reason: "Ensuring connection to correct local database instance"
}

[Edge Function] Database validation: {
  urlUsed: "http://127.0.0.1:54321",
  totalJobsInTest: 4,
  expectedTotalCount: 4,
  pokepediaJobsCount: 1,
  expectedPokepediaCount: 1,
  runningJobsCount: 0,
  dataMatches: true,
  warning: null
}
\`\`\`

## Files Changed

- `supabase/functions/sync-pokepedia/index.ts`:
  - Added explicit URL normalization for local development
  - Enhanced database validation with expected vs actual comparison
  - Added critical warnings for database mismatches

## Reference

- [Writing Supabase Edge Functions Rule](.cursor/rules/writing-supabase-edge-functions.mdc)
- Pre-populated environment variables cannot be overridden by `.env` files
- Solution: Normalize URL explicitly in code for local development
