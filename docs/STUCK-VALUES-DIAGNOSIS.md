# Stuck Values Diagnosis - Why You See the Same Numbers

## The Problem

You're seeing the same values repeatedly (like 14/14 = 100% for "type" resource) even though the sync should be dynamic.

## Root Cause

**`pokepedia_resource_totals` table is EMPTY**

When this table is empty, the `get_pokepedia_sync_progress()` function falls back to using `synced_count` as the total:

```sql
-- From the function:
COALESCE(st.total_count, sc.synced_count, 0)::BIGINT AS total_estimated
```

This means:
- **type**: 14 synced → Shows `14/14 = 100%` (because it uses `synced_count` as total)
- **Everything else**: 0 synced → Shows `0/0 = 0%` (because no synced_count, no total)

## Why Totals Table is Empty

The `pokepedia_resource_totals` table is only populated when you run **"Seed Queue"**. The seed function:
1. Fetches PokeAPI list endpoints (e.g., `/api/v2/pokemon?limit=200&offset=0`)
2. Captures `json.count` (actual total)
3. Stores it in `pokepedia_resource_totals`

**If you haven't seeded recently, or if the seed failed, this table stays empty.**

## Verification

Check if totals are stored:

```sql
SELECT * FROM pokepedia_resource_totals ORDER BY resource_type;
```

If this returns empty, that's why values look stuck.

## Solution

1. **Click "Seed Queue"** - This will:
   - Fetch actual totals from PokeAPI
   - Store them in `pokepedia_resource_totals`
   - Populate the queue with resources to sync

2. **After seeding**, the function will use actual totals:
   - **type**: 14 synced / 20 total = 70% (actual total from PokeAPI)
   - **pokemon**: 0 synced / 1351 total = 0% (actual total from PokeAPI)

3. **Click "Process All"** to sync resources

## No Hardcoded Values

✅ **Verified**: The function has NO hardcoded values. It uses:
- `pokepedia_resource_totals.total_count` (if available)
- `synced_count` (as fallback if totals not available)
- `0` (if nothing synced and no totals)

The function source confirms this:
```sql
-- ABSOLUTELY NO HARDCODED VALUES - Use stored total OR synced_count ONLY
COALESCE(st.total_count, sc.synced_count, 0)::BIGINT AS total_estimated
```

## Why It Looks Stuck

1. **Totals table empty** → Function uses `synced_count` as total → Shows 100% for synced types
2. **Queue empty** → No new resources being processed → Progress doesn't change
3. **Sync paused** → Worker not running → Values stay the same

## Fix Steps

1. **Purge all data** (if needed) - Click "Purge All Data" button
2. **Seed queue** - Click "Seed Queue" to populate totals and queue
3. **Process all** - Click "Process All" to sync everything
4. **Monitor progress** - Watch progress bar update with actual totals

## Tables Being Populated

1. **`pokeapi_resources`** - All resource data (JSONB cache)
2. **`pokepedia_pokemon`** - Normalized Pokemon data (only for pokemon type)
3. **`pokepedia_resource_totals`** - Actual totals from PokeAPI (populated during seed)
4. **`pgmq.pokepedia_ingest`** - Queue messages (populated during seed, cleared during worker)

See `docs/POKEPEDIA-TABLES-DOCUMENTATION.md` for full details.
