# Pokepedia Database Tables Documentation

## Tables Populated by Sync

### 1. `pokeapi_resources` (Primary Cache)
**Purpose**: Stores all PokeAPI resource data as JSONB cache

**Columns**:
- `id` (BIGSERIAL PRIMARY KEY)
- `resource_type` (TEXT) - Type of resource (pokemon, type, ability, etc.)
- `resource_key` (TEXT) - Unique identifier (ID or name)
- `name` (TEXT) - Resource name
- `url` (TEXT) - Original PokeAPI URL
- `data` (JSONB) - Full JSON response from PokeAPI
- `fetched_at` (TIMESTAMPTZ) - When resource was fetched
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Unique Constraint**: `(resource_type, resource_key)`

**Populated By**: `pokepedia-worker` Edge Function

**Data**: All resource types from PokeAPI (pokemon, types, abilities, moves, items, etc.)

---

### 2. `pokepedia_pokemon` (Normalized Pokemon Data)
**Purpose**: Fast access to Pokemon basic stats without parsing JSONB

**Columns**:
- `id` (INTEGER PRIMARY KEY) - Pokemon ID
- `name` (TEXT) - Pokemon name
- `height` (INTEGER) - Height in decimeters
- `weight` (INTEGER) - Weight in hectograms
- `base_experience` (INTEGER) - Base experience yield
- `is_default` (BOOLEAN) - Is default form
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Populated By**: `pokepedia-worker` Edge Function (only for `resource_type = 'pokemon'`)

**Data**: Only Pokemon resources (not other types)

---

### 3. `pokepedia_resource_totals` (Metadata)
**Purpose**: Stores actual total counts from PokeAPI list endpoints

**Columns**:
- `resource_type` (TEXT PRIMARY KEY) - Type of resource
- `total_count` (BIGINT) - Actual total from PokeAPI `json.count`
- `last_updated` (TIMESTAMPTZ) - When total was captured
- `source` (TEXT) - Source of total (default: 'pokeapi_list_endpoint')

**Populated By**: `pokepedia-seed` Edge Function (captures `json.count` from list endpoints)

**Data**: Actual totals for each resource type (e.g., pokemon: 1351, type: 20)

**Important**: If this table is empty, `get_pokepedia_sync_progress()` falls back to using `synced_count` as the total, which makes progress look incorrect.

---

### 4. `pgmq.pokepedia_ingest` (Queue)
**Purpose**: Message queue for pending resources to sync

**Structure**: pgmq queue table (managed by pgmq extension)

**Messages**: `{ url: string, resource_type: string, phase: string }`

**Populated By**: `pokepedia-seed` Edge Function

**Cleared By**: `pokepedia-worker` Edge Function (deletes messages after processing)

---

## Data Flow

```
Seed Operation:
  PokeAPI List Endpoints
    → pokepedia_resource_totals (captures json.count)
    → pgmq.pokepedia_ingest (enqueues URLs)

Worker Operation:
  pgmq.pokepedia_ingest (reads messages)
    → PokeAPI Resource URLs (fetches data)
    → pokeapi_resources (stores JSONB cache)
    → pokepedia_pokemon (if resource_type = 'pokemon')
    → pgmq.pokepedia_ingest (deletes processed messages)
```

---

## Purge Operation

The purge operation (`POST /api/pokepedia/purge`) deletes data from:

1. **`pokeapi_resources`** - All cached resource data
2. **`pokepedia_pokemon`** - All normalized Pokemon data
3. **`pokepedia_resource_totals`** - All stored totals
4. **`pgmq.pokepedia_ingest`** - Queue messages (best-effort)

**After Purge**:
- All synced data is deleted
- Queue is cleared
- You must re-seed to populate queue
- Re-syncing will take time (runs in background)

---

## Why Values Look Stuck

If you're seeing the same values repeatedly:

1. **`pokepedia_resource_totals` is empty**:
   - Function falls back to `synced_count` as total
   - Shows `synced_count / synced_count = 100%` for synced types
   - Shows `0 / 0 = 0%` for unsynced types
   - **Fix**: Run "Seed Queue" to populate totals

2. **Queue is empty**:
   - No new resources being processed
   - Progress doesn't change
   - **Fix**: Run "Seed Queue" then "Process All"

3. **Sync is paused**:
   - Worker not running
   - Queue has items but not processing
   - **Fix**: Click "Process All" to resume

---

## Checking Current State

```sql
-- Check synced resources
SELECT resource_type, COUNT(*) as synced_count
FROM pokeapi_resources
GROUP BY resource_type
ORDER BY synced_count DESC;

-- Check stored totals
SELECT * FROM pokepedia_resource_totals ORDER BY resource_type;

-- Check queue
SELECT queue_length, total_messages FROM pgmq.metrics('pokepedia_ingest');

-- Check sync progress
SELECT * FROM get_pokepedia_sync_progress()
WHERE synced_count > 0 OR total_estimated > 0
ORDER BY resource_type;
```
