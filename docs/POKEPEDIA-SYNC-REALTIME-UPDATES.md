# Pokepedia Sync Real-Time Updates

## Available Data Sources

### 1. **`get_pokepedia_sync_progress()`** - Main Progress Function
**What it returns:**
- `resource_type`: Type of resource (pokemon, move, ability, etc.)
- `synced_count`: Actual count synced from `pokeapi_resources` table
- `total_estimated`: Total from `pokepedia_resource_totals` OR `synced_count` (no hardcoded values)
- `progress_percent`: Percentage complete for each resource type

**Usage:**
```typescript
const { data } = await supabase.rpc('get_pokepedia_sync_progress');
const totalSynced = data.reduce((sum, p) => sum + p.synced_count, 0);
const totalEstimated = data.reduce((sum, p) => sum + p.total_estimated, 0);
```

**Refresh rate:** Poll every 5 seconds (already implemented)

---

### 2. **`get_pokepedia_queue_stats()`** - Queue Status
**What it returns:**
- `queue_name`: Queue name (pokepedia_ingest)
- `queue_length`: Number of messages waiting to be processed
- `oldest_message_age`: Age of oldest message

**Usage:**
```typescript
const { data } = await supabase.rpc('get_pokepedia_queue_stats');
const totalQueueLength = data.reduce((sum, q) => sum + q.queue_length, 0);
```

**Refresh rate:** Poll every 5 seconds (already implemented)

---

### 3. **Direct Table Query** - Actual Resource Count
**What it returns:**
- Direct count from `pokeapi_resources` table

**Usage:**
```typescript
const { count } = await supabase
  .from('pokeapi_resources')
  .select('*', { count: 'exact', head: true });
```

**Refresh rate:** Poll every 5 seconds (already implemented for verification)

---

### 4. **Realtime Subscription** - Live Updates (NEW)
**What it provides:**
- Real-time broadcasts when resources are synced
- Triggered automatically when `pokeapi_resources` table changes

**Usage:**
```typescript
const channel = supabase
  .channel('pokepedia-sync:progress')
  .on('broadcast', { event: 'progress_update' }, (payload) => {
    const { synced_count, total_estimated, progress_percent } = payload.payload;
    // Update UI immediately
  })
  .subscribe();
```

**Refresh rate:** Instant (triggered on database changes)

---

## Current Implementation

### Polling (Every 5 seconds)
✅ `get_pokepedia_sync_progress()` - Main progress data
✅ `get_pokepedia_queue_stats()` - Queue status
✅ Direct count verification - Cross-check

### Realtime (NEW)
✅ `pokepedia-sync:progress` channel - Live updates
✅ Trigger on `pokeapi_resources` INSERT/UPDATE
✅ Automatic broadcasts when sync happens

---

## How It Works

1. **Worker processes queue** → Inserts into `pokeapi_resources`
2. **Trigger fires** → `notify_pokepedia_progress()` executes
3. **Function calculates stats** → Calls `get_pokepedia_sync_progress()`
4. **Broadcasts via Realtime** → Frontend receives instant update
5. **Component updates** → Progress bar reflects new data immediately

---

## Best Practice

**Use both approaches:**
- **Realtime** for instant updates (when sync is actively running)
- **Polling** as fallback (every 5 seconds) for reliability

This ensures:
- ✅ Instant updates when sync is active
- ✅ Reliable updates even if Realtime fails
- ✅ Accurate progress tracking

---

## Testing

To test Realtime updates:
1. Start a sync (seed queue + process worker)
2. Watch browser console for `[Sync Status] Realtime update received:`
3. Progress bar should update immediately as resources sync
4. Polling continues as backup every 5 seconds
