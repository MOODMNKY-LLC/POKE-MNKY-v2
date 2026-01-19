# Pokepedia Sync Failure Analysis

## Why Syncs Have Consistently Failed

### Root Causes Identified

1. **Outdated Component Architecture**
   - Component was built around assumptions that didn't match actual Edge Function behavior
   - Mixed client-side and server-side logic
   - Complex state management that didn't align with actual data flow
   - Hardcoded progress values that didn't reflect reality

2. **Function Column Mismatches**
   - `get_pokepedia_queue_stats()` was using `oldest_msg_age` but `pgmq.metrics()` returns `oldest_msg_age_sec`
   - Function definitions didn't match actual pgmq schema
   - PostgREST caching issues causing stale function definitions

3. **Missing API Abstraction Layer**
   - Frontend directly calling Supabase RPC functions
   - No error handling or retry logic
   - Edge Functions called directly without proper error handling
   - No standardized response format

4. **Progress Calculation Issues**
   - Hardcoded totals in `get_pokepedia_sync_progress()` function
   - `pokepedia_resource_totals` table empty → fell back to `synced_count` → showed 100% prematurely
   - No actual totals captured from PokeAPI during seed

5. **Queue Management Problems**
   - Queue stats function failing → couldn't determine if queue had items
   - "Process All" button disabled when queue empty, but no way to seed
   - No clear feedback on what was happening

---

## What We Fixed

### 1. New API Routes (`/api/pokepedia/*`)

**Before:**
- Frontend directly called Supabase RPC functions
- Edge Functions called directly from frontend
- No error handling

**After:**
- `POST /api/pokepedia/seed` → Wraps Edge Function with error handling
- `POST /api/pokepedia/worker` → Wraps Edge Function with error handling
- `GET /api/pokepedia/status` → Aggregates all status data in one place

**Benefits:**
- Standardized error responses
- Proper error handling and logging
- Single source of truth for status

### 2. New Component (`pokepedia-sync-status-new.tsx`)

**Before:**
- 395 lines of complex state management
- Mixed Realtime subscriptions and polling
- Hardcoded progress values
- Unclear data flow

**After:**
- ~300 lines, focused on API endpoints
- Simple polling (5-second intervals)
- Clear data flow: API → State → UI
- No hardcoded values

**Benefits:**
- Easier to debug
- Clear data flow
- Reliable status updates

### 3. Fixed Database Functions

**Before:**
- `get_pokepedia_queue_stats()` used wrong column names
- Hardcoded totals in `get_pokepedia_sync_progress()`

**After:**
- Fixed column references (`oldest_msg_age_sec`)
- Uses `pokepedia_resource_totals` table (populated during seed)
- Falls back to `synced_count` only if totals not available

**Benefits:**
- Accurate queue stats
- Accurate progress calculation

### 4. Actual Totals Capture

**Before:**
- Totals were hardcoded estimates
- No way to know actual PokeAPI resource counts

**After:**
- Seed function captures `json.count` from PokeAPI list endpoints
- Stores in `pokepedia_resource_totals` table
- Progress uses actual totals

**Benefits:**
- Accurate progress percentages
- Know exactly how many resources exist

---

## How Sync Actually Works Now

### Step 1: Seed
1. User clicks "Seed Queue"
2. `POST /api/pokepedia/seed` → Calls `pokepedia-seed` Edge Function
3. Edge Function:
   - Fetches PokeAPI list endpoints
   - Captures `json.count` → Stores in `pokepedia_resource_totals`
   - Checks existing resources → Skips already synced
   - Enqueues new resources into `pgmq.pokepedia_ingest`

### Step 2: Worker
1. User clicks "Process Batch" or "Process All"
2. `POST /api/pokepedia/worker` → Calls `pokepedia-worker` Edge Function
3. Edge Function:
   - Reads messages from queue (default: 10)
   - Fetches each resource from PokeAPI (with retries)
   - Stores in `pokeapi_resources` table
   - Deletes message from queue
   - Broadcasts progress update

### Step 3: Status
1. Component calls `GET /api/pokepedia/status` every 5 seconds
2. API route:
   - Calls `get_pokepedia_sync_progress()` → Progress per type
   - Calls `get_pokepedia_queue_stats()` → Queue depth
   - Calculates totals and percentages
3. Component displays progress

---

## Testing the New System

### Manual Test Steps

1. **Check Status**
   ```bash
   curl http://localhost:3000/api/pokepedia/status
   ```
   Should return:
   ```json
   {
     "ok": true,
     "progress": [...],
     "queueStats": [...],
     "totals": { "synced": 14, "estimated": 0, "queueLength": 0, "percent": 0 }
   }
   ```

2. **Seed Queue**
   ```bash
   curl -X POST http://localhost:3000/api/pokepedia/seed \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
   Should return:
   ```json
   {
     "ok": true,
     "totalEnqueued": 15234,
     "perType": { "pokemon": 1351, ... }
   }
   ```

3. **Process Batch**
   ```bash
   curl -X POST http://localhost:3000/api/pokepedia/worker \
     -H "Content-Type: application/json" \
     -d '{"batchSize": 10, "concurrency": 1, "rateLimitMs": 300}'
   ```
   Should return:
   ```json
   {
     "ok": true,
     "processed": 10,
     "failed": 0
   }
   ```

4. **Check Status Again**
   - Queue length should decrease
   - Synced count should increase
   - Progress percent should update

---

## Why This Will Work

1. **Clear Data Flow**: API → Component → UI (no complex state)
2. **Actual Totals**: Captured from PokeAPI, not hardcoded
3. **Error Handling**: Proper error messages and retry logic
4. **Queue Management**: Fixed function returns accurate queue stats
5. **Progress Tracking**: Uses actual totals, not estimates

---

## Next Steps

1. **Replace Component**: Old component deleted, new one imported
2. **Test Seed**: Click "Seed Queue" → Verify queue populates
3. **Test Worker**: Click "Process Batch" → Verify resources sync
4. **Monitor Progress**: Watch progress bar update in real-time
5. **Verify Data**: Check `pokeapi_resources` table after sync

---

## If Sync Still Fails

### Check These:

1. **Edge Function Logs**
   ```bash
   supabase functions logs pokepedia-seed
   supabase functions logs pokepedia-worker
   ```

2. **Database Functions**
   ```sql
   SELECT * FROM get_pokepedia_sync_progress() LIMIT 5;
   SELECT * FROM get_pokepedia_queue_stats();
   ```

3. **Queue Status**
   ```sql
   SELECT queue_length, total_messages FROM pgmq.metrics('pokepedia_ingest');
   ```

4. **API Routes**
   - Check browser console for errors
   - Check Network tab for failed requests
   - Verify API routes return `ok: true`

---

## Summary

The sync system was failing because:
- Component was too complex and didn't match actual data flow
- Database functions had bugs (wrong column names)
- No API abstraction layer
- Hardcoded progress values

We fixed it by:
- Building new component from scratch using actual endpoints
- Creating API routes that wrap Edge Functions
- Fixing database functions
- Capturing actual totals from PokeAPI

The new system is simpler, more reliable, and easier to debug.
