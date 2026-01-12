# Edge Function Query Order Fix

## Root Cause Discovered

After analyzing Docker containers and database queries, we discovered:

### The Real Issue

1. **Database Has 12 Jobs**: Direct SQL shows 12 total jobs (9 failed pokepedia, 2 completed pokepedia, 1 running pokepedia)

2. **Edge Function Query Issue**: The Edge Function uses `.limit(5)` **without ORDER BY**, which means:
   - PostgREST returns results in unpredictable order
   - Edge Function might see different 5 jobs each time
   - This explains why Edge Function logs showed 5 pokepedia jobs while we saw different data

3. **Query Inconsistency**: Without ORDER BY, the Edge Function can't reliably see the "most recent" or "expected" jobs

### The Fix

Added `ORDER BY started_at DESC` to ensure consistent, predictable results:

```typescript
const { data: testData, error: testError } = await supabase
  .from("sync_jobs")
  .select("job_id, sync_type, phase, status")
  .order("started_at", { ascending: false })  // ✅ Added ORDER BY
  .limit(10)  // ✅ Increased limit to see more jobs
```

### Why This Matters

- **Deterministic Results**: With ORDER BY, Edge Function will always see the most recent jobs first
- **Better Diagnostics**: Can reliably compare Edge Function data with direct queries
- **Consistent Behavior**: Edge Function behavior becomes predictable and debuggable

## Docker Network Analysis

All containers are correctly configured:
- ✅ All on same Docker network (`supabase_network_POKE-MNKY-v2`)
- ✅ Edge runtime uses `kong:8000` (correct Docker hostname)
- ✅ Service role key matches expected format
- ✅ No networking issues

## Remaining Mystery

There's still a discrepancy:
- **Supabase MCP** shows 3 pokemon_cache jobs
- **Direct psql** shows 0 pokemon_cache jobs

This suggests:
1. Supabase MCP might be querying a different database/schema
2. There might be a caching issue
3. The MCP might be using a different connection context

## Next Steps

1. ✅ Fixed Edge Function query to use ORDER BY
2. ✅ Increased limit to 10 for better visibility
3. ⏳ Investigate Supabase MCP vs direct SQL discrepancy
4. ⏳ Test Edge Function with new query to verify consistent results

## Files Changed

- `supabase/functions/sync-pokepedia/index.ts`:
  - Added `.order("started_at", { ascending: false })` to test query
  - Increased `.limit(5)` to `.limit(10)` for better diagnostics
