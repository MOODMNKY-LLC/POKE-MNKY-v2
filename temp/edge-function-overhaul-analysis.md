# Edge Function Overhaul Analysis & Plan

## Executive Summary

After analyzing the current state of the POKE MNKY application, database schema, and sync infrastructure, this document outlines a comprehensive overhaul plan for the `sync-pokepedia` edge function to align with the current architecture and provide accurate sync status display.

---

## Current State Analysis

### Database Architecture (From Migrations)

**Three-Plane Architecture** (per README):
1. **Canonical Data Plane** (`pokeapi_resources`) - Stores all REST v2 resources as JSONB
2. **Projection Plane** (`pokepedia_pokemon`, `pokepedia_moves`, etc.) - Fast query tables extracted from canonical data
3. **Media Plane** (`pokepedia_assets`) - Sprite metadata + MinIO storage paths

**Current Tables** (from migrations):
- ✅ `pokepedia_pokemon` - Expanded projection table with types, stats, abilities
- ✅ `sync_jobs` - Enhanced with phase, chunk tracking, heartbeat
- ✅ `items`, `berries`, `natures`, `evolution_triggers` - New endpoint tables
- ✅ `pokemon_comprehensive` - Legacy table (may still exist)
- ❓ `pokeapi_resources` - Canonical storage (need to verify exists)
- ❓ `pokepedia_assets` - Sprite metadata (need to verify exists)

### Current Edge Function State

**What It Does**:
- Processes sync jobs in chunks (50 items per chunk default)
- Phases: master, reference, species, pokemon, evolution-chain
- Updates `sync_jobs` table with progress
- Uses `pokemon_comprehensive` table (old schema?)
- Tracks `pokemon_synced` count
- Updates `last_heartbeat` timestamp

**Issues Identified**:
1. ❌ May be using old schema (`pokemon_comprehensive` vs `pokepedia_pokemon`)
2. ❌ Missing support for new endpoints (items, berries, natures, evolution-triggers)
3. ❌ No ETag caching support (inefficient incremental sync)
4. ❌ No queue system integration
5. ❌ No MinIO sprite path handling
6. ❌ Progress tracking may be inaccurate (chunks vs items)

### Infrastructure Features Available

**ETag Caching** (`20260113020000_add_etag_cache_and_optimizations.sql`):
- ETag support for efficient incremental sync
- Reduces API calls by checking ETags before fetching

**Queue System** (`20260113010000_create_pokepedia_queue_system.sql`):
- Background processing queue
- Better error handling and retries
- Scalable architecture

**MinIO Integration**:
- Sprites stored in MinIO (not Supabase Storage)
- 59k+ sprite files
- Need to update sprite paths in database

---

## Overhaul Plan

### Phase 1: Architecture Alignment ✅ (Critical)

**Goal**: Align edge function with three-plane architecture

**Changes**:
1. **Canonical Storage**: Store all PokeAPI responses in `pokeapi_resources` table
   ```sql
   INSERT INTO pokeapi_resources (resource_type, resource_key, data, etag, updated_at)
   VALUES ('pokemon', '25', {...json...}, 'etag-value', NOW())
   ON CONFLICT (resource_type, resource_key) 
   DO UPDATE SET data = EXCLUDED.data, etag = EXCLUDED.etag, updated_at = NOW()
   ```

2. **Projection Building**: Build `pokepedia_pokemon` from canonical data
   ```sql
   -- Extract fields from pokeapi_resources.data JSONB
   INSERT INTO pokepedia_pokemon (pokemon_id, name, types, base_stats, ...)
   SELECT 
     (data->>'id')::int,
     data->>'name',
     data->'types',
     data->'stats',
     ...
   FROM pokeapi_resources
   WHERE resource_type = 'pokemon'
   ```

3. **Asset Tracking**: Update `pokepedia_assets` with MinIO paths
   ```sql
   INSERT INTO pokepedia_assets (pokemon_id, sprite_type, minio_path, ...)
   VALUES (25, 'front_default', 'http://10.0.0.5:30090/pokedex-sprites/...', ...)
   ```

### Phase 2: ETag Support ✅ (Performance)

**Goal**: Implement ETag-based incremental sync

**Changes**:
1. Check ETag before fetching from PokeAPI
2. Only fetch if ETag changed
3. Store ETags in `pokeapi_resources.etag`
4. Track cache hit rate in sync status

**Implementation**:
```typescript
// Check existing ETag
const existing = await supabase
  .from('pokeapi_resources')
  .select('etag')
  .eq('resource_type', 'pokemon')
  .eq('resource_key', pokemonId)
  .single()

// Fetch with ETag header
const response = await fetch(url, {
  headers: existing?.etag ? { 'If-None-Match': existing.etag } : {}
})

if (response.status === 304) {
  // Not modified - skip fetch
  return { cached: true }
}
```

### Phase 3: Queue Integration ✅ (Scalability)

**Goal**: Integrate with queue system for background processing

**Changes**:
1. Enqueue sync jobs instead of processing directly
2. Process queue messages in edge function
3. Better error handling and retries
4. Track queue status in sync display

**Implementation**:
```typescript
// Enqueue sync job
await supabase.rpc('enqueue_pokepedia_sync', {
  phase: 'pokemon',
  priority: 'standard'
})

// Process queue messages
const messages = await supabase.rpc('dequeue_pokepedia_sync', { limit: 10 })
for (const msg of messages) {
  await processSyncMessage(msg)
}
```

### Phase 4: New Endpoints ✅ (Completeness)

**Goal**: Support all new endpoints

**Changes**:
1. Add items, berries, natures, evolution-triggers to phase config
2. Create sync functions for each endpoint
3. Update projection tables as needed

**Endpoints to Add**:
- `items` → `items` table
- `berries` → `berries` table  
- `natures` → `natures` table
- `evolution-trigger` → `evolution_triggers` table

### Phase 5: Progress Tracking ✅ (Accuracy)

**Goal**: Accurate progress tracking

**Changes**:
1. Track items synced per phase (not just chunks)
2. Calculate accurate progress percentages
3. Update heartbeat more frequently (every item, not every chunk)
4. Track ETag cache hits/misses

**Metrics to Track**:
- `items_synced` - Total items synced in current phase
- `items_total` - Total items to sync in phase
- `items_cached` - Items skipped due to ETag cache
- `items_failed` - Items that failed to sync
- `progress_percent` - Accurate percentage (items_synced / items_total * 100)

### Phase 6: MinIO Integration ✅ (Media)

**Goal**: Update sprite paths to use MinIO

**Changes**:
1. Update sprite paths in `pokepedia_assets` to use MinIO URLs
2. Format: `http://10.0.0.5:30090/pokedex-sprites/sprites/pokemon/25.png`
3. Track sprite metadata in `pokepedia_assets` table

---

## Sync Status Component Display

### Header Button (Minimal)

**Always Visible**:
- Status icon (spinning loader / checkmark / info)
- Progress badge (if syncing)
- Click to open modal

**Status States**:
- 🔵 **Syncing**: Spinning loader + progress %
- ✅ **Completed**: Checkmark (brief, auto-hides)
- ℹ️ **Idle**: Info icon (default)

### Comprehensive Modal (Detailed)

**Sections**:

1. **Current Sync Status**
   - Active phase name
   - Progress percentage
   - Items synced / total
   - Last heartbeat (time ago)
   - Estimated completion time

2. **Phase Breakdown**
   - List all phases with status
   - Progress per phase
   - Items synced per phase
   - Time taken per phase

3. **Performance Metrics**
   - ETag cache hit rate
   - Average sync speed (items/sec)
   - Total API calls made
   - Cache hits vs misses

4. **Queue Status** (if using queue)
   - Pending jobs count
   - Processing jobs count
   - Completed jobs count
   - Failed jobs count

5. **Recent History**
   - Last 10 sync jobs
   - Status, phase, duration
   - Items synced, errors

6. **System Health**
   - Database connectivity ✅/❌
   - Edge function connectivity ✅/❌
   - PokeAPI connectivity ✅/❌
   - MinIO connectivity ✅/❌

7. **Actions**
   - Start sync (if idle)
   - Stop sync (if running)
   - Refresh status
   - View logs

---

## Implementation Priority

### Critical (Do First)
1. ✅ Verify current database schema
2. ✅ Update edge function to use correct tables
3. ✅ Fix progress tracking accuracy
4. ✅ Update sync status component display

### High Priority
5. ✅ Add ETag support
6. ✅ Support new endpoints
7. ✅ Integrate queue system

### Medium Priority
8. ✅ MinIO sprite path updates
9. ✅ Enhanced error handling
10. ✅ Performance optimizations

---

## Next Steps

1. **Verify Schema**: Check what tables actually exist
2. **Update Edge Function**: Align with current architecture
3. **Update UI Component**: Display accurate sync status
4. **Test**: Verify sync works correctly
5. **Deploy**: Roll out changes incrementally

---

**Status**: Ready for implementation
**Estimated Time**: 4-6 hours for complete overhaul
**Risk Level**: Medium (significant changes, but well-defined architecture)
