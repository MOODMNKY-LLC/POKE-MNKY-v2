# Sync Component Dynamic Data Fix Plan

## Problem Analysis

### Current Issues
1. **Stale Job Detection**: Component shows stale sync job data (1133 minutes old, 2.1% progress)
2. **Static Values**: Progress, phase, and status appear static/not updating
3. **Initial State**: `checkLocalStatus` doesn't check `last_heartbeat`, assumes any "running" job is active
4. **Polling Gaps**: Polling only runs when status is "syncing" or "stopped", may miss initial stale state
5. **No Cleanup**: Client doesn't clean up stale jobs in database, just detects them

### Root Causes
1. **`checkLocalStatus`** (lines 91-139) queries for `status="running"` but doesn't check `last_heartbeat`
2. **Polling useEffect** (lines 503-641) only runs when `state.status === "syncing" || state.status === "stopped"`
3. **Stale jobs persist** in database with `status="running"` but no recent heartbeat
4. **Progress caching** uses `Math.max(prev.progress, realProgress)` which prevents resetting stale progress

---

## Solution Plan

### Phase 1: Fix `checkLocalStatus` to Detect Stale Jobs

**File**: `hooks/use-pokepedia-sync.ts`

**Changes**:
1. Add `last_heartbeat` to query (already in polling, missing in checkLocalStatus)
2. Check heartbeat age when finding "running" jobs
3. Mark stale jobs (>5 min) as "stopped" immediately
4. Don't set status to "syncing" if job is stale

**Code Changes**:
```typescript
// Line 97-104: Update query to include last_heartbeat
const { data: activeJob } = await supabase
  .from("sync_jobs")
  .select("job_id, phase, status, progress_percent, current_chunk, total_chunks, last_heartbeat")
  .eq("sync_type", "pokepedia")
  .eq("status", "running")
  .order("started_at", { ascending: false })
  .limit(1)
  .maybeSingle()

// After line 106: Check if job is stale
if (activeJob) {
  const lastHeartbeat = activeJob.last_heartbeat 
    ? new Date(activeJob.last_heartbeat).getTime() 
    : new Date(activeJob.started_at).getTime()
  const minutesSinceHeartbeat = (Date.now() - lastHeartbeat) / (1000 * 60)
  const isStale = minutesSinceHeartbeat > 5
  
  if (isStale) {
    // Mark as stopped, don't show as syncing
    setState((prev) => ({
      ...prev,
      localCount,
      status: "stopped",
      progress: activeJob.progress_percent || 0,
      phase: activeJob.phase,
      isStale: true,
      message: `Sync appears stopped (no update in ${Math.round(minutesSinceHeartbeat)}min)`,
    }))
    return { needsSync: false, syncStatus }
  }
  
  // Job is active, proceed normally
  // ... existing code
}
```

---

### Phase 2: Add Stale Job Cleanup Function

**File**: `hooks/use-pokepedia-sync.ts`

**New Function**:
```typescript
// Add after checkLocalStatus
const cleanupStaleJobs = useCallback(async () => {
  try {
    // Find stale running jobs (>10 minutes without heartbeat)
    const { data: staleJobs } = await supabase
      .from("sync_jobs")
      .select("job_id, last_heartbeat, started_at")
      .eq("sync_type", "pokepedia")
      .eq("status", "running")
    
    if (!staleJobs || staleJobs.length === 0) return
    
    const now = Date.now()
    const staleJobIds: string[] = []
    
    for (const job of staleJobs) {
      const lastHeartbeat = job.last_heartbeat 
        ? new Date(job.last_heartbeat).getTime() 
        : new Date(job.started_at).getTime()
      const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60)
      
      if (minutesSinceHeartbeat > 10) {
        staleJobIds.push(job.job_id)
      }
    }
    
    if (staleJobIds.length > 0) {
      // Mark stale jobs as failed
      await supabase
        .from("sync_jobs")
        .update({ 
          status: "failed",
          error_log: { reason: "Stale job detected - no heartbeat in 10+ minutes" }
        })
        .in("job_id", staleJobIds)
      
      console.log(`[Sync] Cleaned up ${staleJobIds.length} stale job(s)`)
    }
  } catch (error) {
    console.error("[Sync] Error cleaning up stale jobs:", error)
  }
}, [])
```

**Call cleanup on mount**:
```typescript
// In useEffect for auto-start (line 689)
useEffect(() => {
  if (!autoStart) return
  
  // Clean up stale jobs first
  cleanupStaleJobs().then(() => {
    checkLocalStatus().then(({ needsSync }) => {
      if (needsSync) {
        startSync()
      }
    })
  })
}, [autoStart, cleanupStaleJobs, checkLocalStatus, startSync])
```

---

### Phase 3: Improve Polling Logic

**File**: `hooks/use-pokepedia-sync.ts`

**Changes**:
1. Run polling on mount regardless of initial status
2. Clean up stale jobs during polling
3. Reset progress when no active job exists
4. Ensure all values come from fresh database queries

**Code Changes**:
```typescript
// Line 503-641: Update polling useEffect
useEffect(() => {
  // Always poll on mount to get current state
  // Also poll when syncing or stopped
  const shouldPoll = state.status === "syncing" || 
                     state.status === "stopped" || 
                     state.status === "idle" // Also poll when idle to detect new jobs
  
  if (!shouldPoll && state.status !== "idle") return
  
  const pollProgress = async () => {
    try {
      // Clean up stale jobs first
      await cleanupStaleJobs()
      
      // Check for running jobs
      const { data: runningJobs, error: runningError } = await supabase
        .from("sync_jobs")
        .select("job_id, phase, status, current_chunk, total_chunks, pokemon_synced, progress_percent, started_at, last_heartbeat")
        .eq("sync_type", "pokepedia")
        .eq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      
      // ... rest of polling logic
      // IMPORTANT: Reset progress when no active job
      if (runningError || !runningJobs) {
        // No running job - reset to idle if we were syncing
        if (state.status === "syncing" || state.status === "stopped") {
          const localCount = await getLocalPokemonCount()
          setState((prev) => ({
            ...prev,
            status: "idle",
            progress: 0, // Reset progress
            phase: null,
            estimatedTimeRemaining: null,
            isStale: false,
            localCount,
            message: localCount > 0 
              ? `Local: ${localCount} Pokemon` 
              : "Ready to sync",
          }))
        }
        return
      }
      
      // ... existing stale detection logic
    } catch (error) {
      console.error("[Sync] Error polling sync progress:", error)
    }
  }
  
  // Poll immediately, then every 2 seconds
  pollProgress()
  const interval = setInterval(pollProgress, 2000)
  
  return () => clearInterval(interval)
}, [state.status, cleanupStaleJobs, checkLocalStatus, calculateTimeRemaining])
```

---

### Phase 4: Fix Progress Display Logic

**File**: `hooks/use-pokepedia-sync.ts`

**Changes**:
1. Don't use `Math.max(prev.progress, realProgress)` for stale jobs
2. Reset progress when job becomes stale
3. Only show progress from active (non-stale) jobs

**Code Changes**:
```typescript
// Line 536-546: Update progress setting logic
setState((prev) => ({
  ...prev,
  progress: isStale ? prev.progress : realProgress, // Don't update progress if stale
  phase: phase,
  estimatedTimeRemaining: isStale ? null : estimatedSeconds, // No ETA if stale
  isStale: isStale,
  status: isStale ? "stopped" : "syncing",
  message: isStale 
    ? `Sync appears stopped (no update in ${Math.round(minutesSinceHeartbeat)}min). Last: ${phase} phase: ${currentChunk}/${totalChunks} chunks`
    : `Syncing ${phase} phase: ${currentChunk}/${totalChunks} chunks (${realProgress.toFixed(1)}%)`,
}))
```

---

### Phase 5: Ensure Component Always Shows Fresh Data

**File**: `components/pokepedia-sync-provider.tsx`

**Changes**:
1. Add refresh button to force re-check
2. Ensure banner always reflects current state
3. Add visual indicator when data is stale

**Code Changes**:
```typescript
// Add refresh handler
const handleRefresh = async () => {
  await syncState.checkLocalStatus()
}

// Update banner to show refresh option when stale
{syncState.isStale && (
  <Button
    size="sm"
    variant="outline"
    onClick={handleRefresh}
    className="h-7 px-2 text-xs mt-2"
  >
    <RotateCw className="h-3 w-3 mr-1" />
    Refresh Status
  </Button>
)}
```

---

## Implementation Steps

### Step 1: Update `checkLocalStatus`
- Add `last_heartbeat` to query
- Check heartbeat age
- Mark stale jobs as "stopped"

### Step 2: Add `cleanupStaleJobs` function
- Query for stale jobs (>10 min)
- Mark as "failed" in database
- Call on mount and during polling

### Step 3: Improve polling useEffect
- Run on mount regardless of status
- Clean up stale jobs during polling
- Reset state when no active job

### Step 4: Fix progress logic
- Don't cache stale progress
- Reset when job becomes stale
- Only show active job progress

### Step 5: Add refresh capability
- Add refresh button in UI
- Force re-check of status
- Visual indicator for stale state

---

## Testing Checklist

- [ ] Component shows correct status on mount (not stale)
- [ ] Stale jobs are detected and marked as "stopped"
- [ ] Progress updates dynamically from database
- [ ] Polling runs continuously when sync is active
- [ ] Stale jobs are cleaned up in database
- [ ] Component resets to idle when no active sync
- [ ] Refresh button forces re-check
- [ ] All values come from fresh database queries

---

## Expected Results

After implementation:
- ✅ Component shows **real-time** sync status
- ✅ Stale jobs are **automatically detected** and cleaned up
- ✅ Progress **updates dynamically** from database
- ✅ No more **static/stale values** displayed
- ✅ Component **resets properly** when sync completes or fails
- ✅ All UI values come from **fresh database queries**

---

## Files to Modify

1. `hooks/use-pokepedia-sync.ts` - Main sync logic
2. `components/pokepedia-sync-provider.tsx` - UI component (optional refresh button)

---

**Status**: Ready for review and approval
