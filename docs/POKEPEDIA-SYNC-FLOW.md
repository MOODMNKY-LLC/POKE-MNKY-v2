# Pokepedia Sync Flow - Complete Documentation

## Overview

The Pokepedia sync system fetches data from the official PokeAPI and stores it in Supabase. It uses a queue-based architecture to handle large-scale data ingestion reliably.

---

## Architecture

### Components

1. **Edge Functions** (Supabase)
   - `pokepedia-seed`: Discovers and enqueues resource URLs
   - `pokepedia-worker`: Processes queue messages and fetches data

2. **Database Functions** (PostgreSQL)
   - `get_pokepedia_sync_progress()`: Returns sync progress per resource type
   - `get_pokepedia_queue_stats()`: Returns queue depth metrics
   - `broadcast_pokepedia_sync_progress()`: Broadcasts progress via Realtime

3. **API Routes** (Next.js)
   - `POST /api/pokepedia/seed`: Triggers seed operation
   - `POST /api/pokepedia/worker`: Triggers worker operation
   - `GET /api/pokepedia/status`: Returns current sync status

4. **Frontend Component**
   - `components/admin/pokepedia-sync-status-new.tsx`: UI for monitoring and control

---

## Sync Flow (Step-by-Step)

### Phase 1: Seed (Discovery)

**What happens:**
1. User clicks "Seed Queue" button
2. Frontend calls `POST /api/pokepedia/seed`
3. API route calls `pokepedia-seed` Edge Function
4. Edge Function:
   - Fetches list endpoints from PokeAPI (e.g., `/api/v2/pokemon?limit=200&offset=0`)
   - Captures `json.count` (actual total) and stores in `pokepedia_resource_totals`
   - Checks which resources already exist using `check_existing_pokeapi_resources()`
   - Enqueues only NEW resources into `pgmq.pokepedia_ingest` queue
   - Processes resources in dependency order (master → reference → species → pokemon → relationships)

**Output:**
- Queue populated with resource URLs
- `pokepedia_resource_totals` table updated with actual counts

**Example:**
```json
{
  "ok": true,
  "totalEnqueued": 15234,
  "perType": {
    "pokemon": 1351,
    "type": 20,
    "ability": 267
  }
}
```

---

### Phase 2: Worker (Processing)

**What happens:**
1. User clicks "Process Batch" or "Process All"
2. Frontend calls `POST /api/pokepedia/worker`
3. API route calls `pokepedia-worker` Edge Function
4. Edge Function:
   - Reads up to `batchSize` messages from queue (default: 10)
   - For each message:
     - Checks if resource already synced (within 24 hours) → skip if yes
     - Fetches resource from PokeAPI URL with retry logic (3 retries, exponential backoff)
     - Validates response structure
     - Upserts into `pokeapi_resources` table (JSONB cache)
     - If Pokemon type: Also upserts into `pokepedia_pokemon` table (normalized)
     - Deletes message from queue after success
   - Broadcasts progress update via `broadcast_pokepedia_sync_progress()`

**Output:**
- Resources stored in `pokeapi_resources` table
- Queue messages deleted after processing
- Progress broadcasted via Realtime

**Example:**
```json
{
  "ok": true,
  "processed": 10,
  "failed": 0,
  "sequential": true,
  "rateLimitMs": 300
}
```

---

### Phase 3: Status (Monitoring)

**What happens:**
1. Frontend calls `GET /api/pokepedia/status` (auto-refresh every 5 seconds)
2. API route:
   - Calls `get_pokepedia_sync_progress()` → Returns progress per resource type
   - Calls `get_pokepedia_queue_stats()` → Returns queue depth
   - Calculates totals and percentages

**Output:**
```json
{
  "ok": true,
  "progress": [
    {
      "resource_type": "pokemon",
      "synced_count": 1351,
      "total_estimated": 1351,
      "progress_percent": 100
    }
  ],
  "queueStats": [
    {
      "queue_name": "pokepedia_ingest",
      "queue_length": 0
    }
  ],
  "totals": {
    "synced": 15234,
    "estimated": 15234,
    "queueLength": 0,
    "percent": 100
  }
}
```

---

## Data Storage

### Tables

1. **`pokeapi_resources`** (JSONB cache)
   - `resource_type`: Type of resource (pokemon, type, ability, etc.)
   - `resource_key`: Unique identifier (ID or name)
   - `name`: Resource name
   - `url`: Original PokeAPI URL
   - `data`: Full JSONB response from PokeAPI
   - `fetched_at`: Timestamp of last fetch

2. **`pokepedia_resource_totals`** (Metadata)
   - `resource_type`: Type of resource
   - `total_count`: Actual total from PokeAPI (from `json.count`)
   - `last_updated`: When total was captured
   - `source`: "pokeapi_list_endpoint"

3. **`pokepedia_pokemon`** (Normalized Pokemon data)
   - `id`: Pokemon ID
   - `name`: Pokemon name
   - `height`, `weight`, `base_experience`: Basic stats
   - `is_default`: Is default form

4. **`pgmq.pokepedia_ingest`** (Queue)
   - Messages contain: `{ url, resource_type, phase }`

---

## Why Syncs Fail

### Common Failure Points

1. **Seed Failures**
   - Missing helper functions (`pgmq_public_send_batch`, `check_existing_pokeapi_resources`)
   - PokeAPI rate limiting (429 errors)
   - Network timeouts

2. **Worker Failures**
   - PokeAPI rate limiting (429 errors) → Retries help but can still fail
   - Network timeouts → 30-second timeout, 3 retries
   - Invalid responses → Validation fails
   - Database errors → Upsert fails

3. **Status Failures**
   - Function errors (`get_pokepedia_queue_stats` column mismatches)
   - PostgREST caching → Stale function definitions
   - Missing totals → Falls back to `synced_count` (shows 100% prematurely)

### Solutions Implemented

1. **Retry Logic**: 3 retries with exponential backoff
2. **Rate Limiting**: Sequential processing with 300ms delay
3. **Skip Already Synced**: Checks `fetched_at` within 24 hours
4. **Actual Totals**: Captures `json.count` from PokeAPI, stores in `pokepedia_resource_totals`
5. **Progress Broadcasting**: Realtime updates for live UI
6. **API Routes**: Wrapper routes for reliable Edge Function calls

---

## Usage

### Manual Sync

1. **Seed Queue**: Click "Seed Queue" → Populates queue with new resources
2. **Process Batch**: Click "Process Batch" → Processes 10 messages
3. **Process All**: Click "Process All" → Loops until queue empty (max 1000 iterations)

### Monitoring

- **Auto-refresh**: Status updates every 5 seconds
- **Progress Bar**: Shows overall sync percentage
- **Queue Status**: Shows current queue depth
- **Resource Breakdown**: Shows progress per resource type

---

## Troubleshooting

### Queue Stuck

**Symptoms:** Queue length > 0 but not processing

**Fix:**
1. Check Edge Function logs: `supabase functions logs pokepedia-worker`
2. Verify queue messages: `SELECT * FROM pgmq.metrics('pokepedia_ingest')`
3. Try "Process Batch" manually
4. Check for rate limiting errors in logs

### Progress Stuck at Wrong Percentage

**Symptoms:** Shows 25.4% but database has different counts

**Fix:**
1. Check `pokepedia_resource_totals`: `SELECT * FROM pokepedia_resource_totals`
2. Re-seed to update totals: Click "Seed Queue"
3. Verify function: `SELECT * FROM get_pokepedia_sync_progress() LIMIT 5`

### Seed Fails

**Symptoms:** "Seed Queue" button fails with function errors

**Fix:**
1. Verify migrations applied: Check `supabase_migrations.schema_migrations`
2. Check helper functions exist:
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN ('pgmq_public_send_batch', 'check_existing_pokeapi_resources');
   ```
3. Re-apply migrations if needed

---

## Next Steps

1. **Test new component**: Replace old component with `pokepedia-sync-status-new.tsx`
2. **Monitor sync**: Watch progress bar and queue status
3. **Verify data**: Check `pokeapi_resources` table after sync completes
4. **Use data**: Query `pokeapi_resources` for app features
