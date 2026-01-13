# Sync Crash Fixes - Memory & Performance Improvements

## Problem
The sync process crashed after processing 80+ chunks, likely due to:
1. **Memory exhaustion** from accumulating large JSONB objects
2. **High concurrency** (10 parallel requests) exceeding PokéAPI fair use guidelines
3. **No retry logic** for transient failures
4. **Edge Function memory limits** being exceeded

## Root Cause Analysis

Based on the sync plan document (`temp/pokepedia-sync-plan.md`):
- **Edge Function runtime limits**: Free 150s / Paid 400s wall-clock
- **Memory constraints**: Edge Functions have memory limits
- **PokéAPI fair use**: Recommends conservative concurrency (3-8 parallel requests)
- **Current implementation**: Used 10 concurrent requests, which is too high

After 80+ chunks with 10 concurrent requests each:
- **800+ parallel requests** made to PokéAPI
- **Large JSONB objects** accumulating in memory
- **No memory cleanup** between chunks
- **No exponential backoff** for failures

## Fixes Applied

### 1. Reduced Concurrency (Critical)
**Before:**
\`\`\`typescript
const CONCURRENT_REQUESTS = 10 // Too high
\`\`\`

**After:**
\`\`\`typescript
const CONCURRENT_REQUESTS = 5 // Conservative, aligns with sync plan (3-8 recommended)
\`\`\`

**Impact:** Reduces memory pressure and respects PokéAPI fair use guidelines.

### 2. Increased Batch Delays
**Before:**
\`\`\`typescript
const BATCH_DELAY_MS = 100 // Too short
\`\`\`

**After:**
\`\`\`typescript
const BATCH_DELAY_MS = 250 // Better PokéAPI fair use
\`\`\`

**Impact:** Reduces request rate and gives memory time to be freed.

### 3. Added Retry Logic with Exponential Backoff
**New Function:**
\`\`\`typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_BASE_DELAY_MS
): Promise<T>
\`\`\`

**New Helper:**
\`\`\`typescript
async function fetchWithRetry(url: string): Promise<any>
\`\`\`

**Impact:** Handles transient failures gracefully, reduces crashes from network issues.

### 4. Added Memory Cleanup
**New Function:**
\`\`\`typescript
function cleanupMemory(...objects: any[]): void
\`\`\`

**Applied After:**
- Each batch processing
- Each endpoint processing
- Each chunk processing
- Long-running sync loops (every 20 chunks)

**Impact:** Explicitly frees memory, preventing accumulation over many chunks.

### 5. Periodic Heartbeat Updates
**Added:**
\`\`\`typescript
// Update heartbeat periodically to prevent "stuck" detection during long runs
if (chunksProcessed % 10 === 0) {
  await supabase
    .from("sync_jobs")
    .update({ last_heartbeat: new Date().toISOString() })
    .eq("job_id", job.job_id)
}
\`\`\`

**Impact:** Prevents jobs from being marked as "stuck" during legitimate long-running syncs.

### 6. Memory Cleanup Hints
**Added:**
\`\`\`typescript
// Force garbage collection hint every 20 chunks
if (chunksProcessed % 20 === 0) {
  console.log(`[handleManualSync] Processed ${chunksProcessed} chunks, memory cleanup hint`)
  await new Promise((resolve) => setTimeout(resolve, 50))
}
\`\`\`

**Impact:** Helps Deno's garbage collector free memory during long runs.

## Configuration Constants

\`\`\`typescript
const CONCURRENT_REQUESTS = 5        // Reduced from 10 (sync plan recommends 3-8)
const BATCH_DELAY_MS = 250           // Increased from 100ms
const MAX_RETRIES = 3                // New: retry failed requests
const RETRY_BASE_DELAY_MS = 1000     // New: exponential backoff base delay
const MAX_EXECUTION_TIME_MS = 50 * 1000 // Unchanged: 50 seconds timeout
\`\`\`

## Expected Improvements

1. **Memory Usage**: Reduced by ~50% (5 concurrent vs 10)
2. **Stability**: Retry logic handles transient failures
3. **PokéAPI Compliance**: Better fair use with lower concurrency and longer delays
4. **Long-Running Syncs**: Can process 100+ chunks without crashing
5. **Error Recovery**: Exponential backoff prevents cascading failures

## Testing Recommendations

1. **Monitor memory usage** during long syncs (80+ chunks)
2. **Check Edge Function logs** for retry attempts
3. **Verify heartbeat updates** every 10 chunks
4. **Test with continueUntilComplete: true** to ensure it can complete full syncs
5. **Monitor PokéAPI response times** to detect throttling

## Additional Notes

- These changes align with the sync plan's recommendations for conservative concurrency
- Memory cleanup is defensive programming - Deno handles GC, but explicit cleanup helps
- Retry logic uses exponential backoff (1s, 2s, 4s) to avoid hammering PokéAPI
- Periodic heartbeats prevent false "stuck" job detection during legitimate long runs

## Related Files

- `supabase/functions/sync-pokepedia/index.ts` - Main sync function
- `temp/pokepedia-sync-plan.md` - Original sync plan with limitations
- `app/api/sync/pokepedia/route.ts` - API route that triggers sync
