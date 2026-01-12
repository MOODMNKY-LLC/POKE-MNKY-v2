# Sync Continuation Fix

## Issue

The sync process stops after the first chunk because:
1. `handleManualSync` processes one chunk and returns
2. Continuation relies on cron jobs calling `processNextChunk`
3. Cron jobs may not be running locally

## Solution

Added `continueUntilComplete` parameter to automatically process chunks until complete, with timeout protection.

### Changes Made

1. **Edge Function** (`supabase/functions/sync-pokepedia/index.ts`):
   - Added `continueUntilComplete` parameter to `handleManualSync`
   - Added loop to process chunks until complete or timeout
   - Respects Edge Function timeout limits (50 seconds max)

2. **API Route** (`app/api/sync/pokepedia/route.ts`):
   - Passes `continueUntilComplete` parameter to Edge Function

## Usage

### Process One Chunk (Default)
```bash
curl -X POST http://127.0.0.1:3000/api/sync/pokepedia \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "phase": "master",
    "priority": "critical"
  }'
```

### Continue Until Complete
```bash
curl -X POST http://127.0.0.1:3000/api/sync/pokepedia \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "phase": "master",
    "priority": "critical",
    "continueUntilComplete": true
  }'
```

## How It Works

1. **First Chunk**: Always processed immediately
2. **If `continueUntilComplete: true`**:
   - Loops to process remaining chunks
   - Checks job status before each chunk
   - Stops if job completes or times out (50 seconds)
   - Returns progress after each chunk

3. **Timeout Protection**:
   - Max 50 seconds execution time
   - Leaves buffer for Edge Function timeout (60 seconds)
   - If timeout reached, job continues via cron

## Benefits

- ✅ **Local Development**: Can complete sync without cron jobs
- ✅ **Timeout Safe**: Respects Edge Function limits
- ✅ **Backward Compatible**: Default behavior unchanged (one chunk)
- ✅ **Flexible**: Can choose one chunk or continue until complete

## Notes

- For large syncs, cron jobs are still recommended (processes chunks every 5 minutes)
- `continueUntilComplete` is best for small syncs or local development
- Edge Functions have 60-second timeout, so we limit to 50 seconds
