# Sync Progress Data Sources

## What You Can Ping for Real-Time Updates

### 1. **`get_pokepedia_sync_progress()`** - Main Progress Function ✅
**Endpoint:** RPC function via Supabase client
```typescript
const { data } = await supabase.rpc('get_pokepedia_sync_progress');
```

**Returns:**
- Array of resource types with:
  - `synced_count`: Actual count from `pokeapi_resources` table
  - `total_estimated`: From `pokepedia_resource_totals` OR `synced_count` (no hardcoded values)
  - `progress_percent`: Percentage complete

**Refresh Rate:** Currently polls every 5 seconds ✅

**Best For:** Overall progress calculation

---

### 2. **`get_pokepedia_queue_stats()`** - Queue Status ✅
**Endpoint:** RPC function via Supabase client
```typescript
const { data } = await supabase.rpc('get_pokepedia_queue_stats');
```

**Returns:**
- Queue name, length, message age
- Shows how many items are waiting to be processed

**Refresh Rate:** Currently polls every 5 seconds ✅

**Best For:** Queue status and "Process All" button state

---

### 3. **Direct Table Query** - Actual Resource Count ✅
**Endpoint:** Direct Supabase query
```typescript
const { count } = await supabase
  .from('pokeapi_resources')
  .select('*', { count: 'exact', head: true });
```

**Returns:**
- Total count of synced resources

**Refresh Rate:** Currently polls every 5 seconds (for verification) ✅

**Best For:** Cross-checking function results

---

### 4. **Realtime Subscription** - Live Updates ✅ NEW
**Endpoint:** Supabase Realtime channel
```typescript
const channel = supabase
  .channel('pokepedia-sync:progress')
  .on('broadcast', { event: 'progress_update' }, (payload) => {
    // Instant update when sync happens
  })
  .subscribe();
```

**Returns:**
- `synced_count`: Current synced count
- `total_estimated`: Current total estimate
- `progress_percent`: Calculated percentage
- `queue_length`: Current queue length
- `timestamp`: When update was sent

**Refresh Rate:** Instant (triggered when resources sync) ✅

**Best For:** Real-time progress bar updates

**How it works:**
- Worker processes batch → Inserts into `pokeapi_resources`
- Worker calls `broadcast_pokepedia_sync_progress()` → Sends Realtime update
- Frontend receives update → Progress bar updates immediately

---

## Current Implementation Status

✅ **Polling (5 seconds):**
- `get_pokepedia_sync_progress()` - Main progress
- `get_pokepedia_queue_stats()` - Queue status
- Direct count verification

✅ **Realtime (Instant):**
- `pokepedia-sync:progress` channel subscription
- Worker broadcasts after each batch
- Component receives instant updates

---

## Recommended Approach

**Use both:**
1. **Realtime** for instant updates (when sync is running)
2. **Polling** as fallback (every 5 seconds) for reliability

This ensures:
- ✅ Progress bar updates instantly when sync happens
- ✅ Still works if Realtime fails
- ✅ Accurate progress tracking

---

## Testing

To verify it's working:

1. **Check console logs:**
   - `[Sync Status] 📡 Realtime update received:` - Realtime working
   - `[Sync Status] Auto-refreshing...` - Polling working

2. **Start a sync:**
   - Click "Seed Queue"
   - Click "Process Batch" or "Process All"
   - Watch progress bar update in real-time

3. **Expected behavior:**
   - Progress bar updates immediately as resources sync (Realtime)
   - Continues updating every 5 seconds (Polling fallback)
   - Shows accurate percentages based on actual totals
