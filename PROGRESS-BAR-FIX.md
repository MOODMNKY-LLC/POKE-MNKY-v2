# Progress Bar Fix

## Issue Discovered

The progress bar wasn't updating because `total_chunks` was always `0` for master phase jobs, causing `progress_percent` to always be `0.00`.

## Root Cause

1. **Master Phase Missing Logic**: The `syncMasterDataPhase` function fetched resource lists but never calculated or set `total_chunks`
2. **Progress Calculation**: The progress formula requires `total_chunks > 0`:
   ```typescript
   progress = job.total_chunks > 0 
     ? Math.min((newCurrent / job.total_chunks) * 100, 100)
     : 0  // Always 0 if total_chunks is 0
   ```
3. **Comparison**: Other phases (species, pokemon) correctly set `total_chunks` when `current_chunk === 0`, but master phase was missing this logic

## Solution Implemented

### 1. Added total_chunks Calculation for Master Phase

When `current_chunk === 0` and `total_chunks === 0`, the master phase now:
1. Fetches resource lists for all master endpoints
2. Finds the maximum count across all endpoints
3. Calculates `total_chunks = Math.ceil(maxCount / chunk_size)`
4. Updates the job with `total_chunks` and `end_id`

```typescript
if (job.current_chunk === 0 && job.total_chunks === 0) {
  let maxCount = 0
  // Fetch all endpoint counts...
  // Calculate total_chunks = Math.ceil(maxCount / chunk_size)
  await supabase
    .from("sync_jobs")
    .update({ total_chunks: totalChunks, end_id: maxCount })
    .eq("job_id", job.job_id)
}
```

### 2. Enhanced Progress Calculation

Added fallback progress calculation if `total_chunks` is still 0:

```typescript
let progress = 0
if (job.total_chunks > 0) {
  progress = Math.min((newCurrent / job.total_chunks) * 100, 100)
} else if (job.end_id > 0) {
  // Fallback: estimate from synced items
  progress = Math.min((newSynced / job.end_id) * 100, 100)
}
```

### 3. Updated Existing Job

Manually updated the current running job:
- `total_chunks`: 88 (based on moves count: 880 / chunk_size 10)
- `end_id`: 880
- `progress_percent`: Will now calculate correctly

## Expected Behavior

For master phase with chunk_size=10:
- **Moves**: 880 resources → 88 chunks
- **Abilities**: 367 resources → 37 chunks  
- **Types**: 21 resources → 3 chunks
- **Total chunks**: 88 (max across all endpoints)

Progress calculation:
- Chunk 1: `(1 / 88) * 100 = 1.14%`
- Chunk 2: `(2 / 88) * 100 = 2.27%`
- Chunk 10: `(10 / 88) * 100 = 11.36%`
- Chunk 88: `(88 / 88) * 100 = 100%`

## Files Changed

- `supabase/functions/sync-pokepedia/index.ts`:
  - Added `total_chunks` calculation in `syncMasterDataPhase`
  - Enhanced progress calculation with fallback
  - Updated existing job manually for immediate fix

## Next Steps

1. ✅ Fix applied to code (will work for new jobs)
2. ✅ Existing job updated manually
3. ⏳ Edge Function will auto-reload
4. ⏳ Future chunks will update progress_percent correctly
5. ⏳ Progress bar should now display accurate progress
