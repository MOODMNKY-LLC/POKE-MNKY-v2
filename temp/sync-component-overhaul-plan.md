# Sync Component Overhaul Plan

## Issues Identified

1. **Scrollbar visibility** - Info popout shows scrollbar
2. **Refresh button not working** - `handleRefresh` may not be properly async/awaiting
3. **Not pulling data from Supabase** - Component may not be using Platform Kit hooks (though standard client should work)
4. **Front-facing component wrong** - Status/restart/progress bar logic is incorrect
5. **Not connected to health checks** - No database connectivity status
6. **Not polling properly** - May not be checking sync_jobs correctly
7. **Text not relevant** - Messages don't reflect actual sync process

## Solution Plan

### Phase 1: Fix UI Issues
1. **Hide scrollbar** - Add CSS class `scrollbar-hide` or custom CSS
2. **Fix refresh button** - Ensure proper async/await handling

### Phase 2: Overhaul Hook to Properly Poll sync_jobs
1. **Always poll on mount** - Check sync_jobs immediately
2. **Poll every 2s when active** - When status is syncing/stopped/idle
3. **Read actual sync_jobs data**:
   - `phase` (master, pokemon, relationships, etc.)
   - `current_chunk` / `total_chunks`
   - `progress_percent`
   - `pokemon_synced` (items synced)
   - `status` (running, completed, failed)
   - `last_heartbeat`
4. **Update state with real data** - Not hardcoded values

### Phase 3: Overhaul Front-Facing Component
1. **Better status display**:
   - Show actual phase name (capitalized)
   - Show chunk progress: "15/47 chunks"
   - Show items synced: "150 items synced"
   - Show percentage: "32.0%"
2. **Better messages**:
   - "Syncing master data: 15/47 chunks (32.0%) - 150 items synced"
   - "Syncing Pokemon data: 250/1025 Pokemon (24.4%)"
   - "Sync completed: All 1025 Pokemon synced"
3. **Fix button logic**:
   - When syncing: Show nothing or "Stop" (if we add that)
   - When stopped/error: Show "Retry" or "Start"
   - When idle: Show "Start"
   - When completed: Hide banner (if progress = 100%)
4. **Add health check**:
   - Call `/api/admin/health-check` to verify database connectivity
   - Show connectivity status in banner

### Phase 4: Improve Polling Logic
1. **Poll on mount** - Always check sync_jobs on component mount
2. **Poll continuously** - Every 2s when there's potential activity
3. **Handle edge cases**:
   - No active job → reset to idle
   - Stale job → mark as stopped
   - Completed job → show completion message
   - Failed job → show error message

### Phase 5: Better State Management
1. **Add more state fields**:
   - `itemsSynced: number` - From `pokemon_synced`
   - `currentChunk: number` - From `current_chunk`
   - `totalChunks: number` - From `total_chunks`
   - `databaseConnected: boolean` - From health check
2. **Update messages dynamically** - Based on actual sync_jobs data

## Implementation Steps

### Step 1: Fix Scrollbar
- Add `scrollbar-hide` class or custom CSS to modal

### Step 2: Fix Refresh Button
- Ensure `handleRefresh` properly awaits async calls
- Update state after refresh

### Step 3: Update Hook
- Add health check integration
- Improve polling to always check sync_jobs
- Add more state fields for better display

### Step 4: Rewrite Banner Component
- Show real sync_jobs data
- Better status messages
- Fix button logic
- Add connectivity indicator

### Step 5: Test
- Verify polling works
- Verify health check works
- Verify messages are accurate
- Verify buttons work correctly

## Expected Results

- ✅ Scrollbar hidden in info popout
- ✅ Refresh button works
- ✅ Component shows real sync_jobs data
- ✅ Proper polling every 2s
- ✅ Health check integration
- ✅ Relevant status messages
- ✅ Correct button logic
- ✅ Accurate progress display
