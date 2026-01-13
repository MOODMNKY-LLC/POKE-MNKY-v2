# Sync Stale Job Fix - Debug Complete ✅

## Problem Identified

The sync banner was showing **"Syncing Master: 1/47 chunks (2.1%)"** even though:
- The database already has **1350 Pokemon** synced
- This indicates a **stale sync_jobs entry** that hasn't been cleaned up
- The sync likely completed but the job wasn't marked as "completed"

## Root Cause

1. **Stale Job Detection**: Component finds a "running" job with old heartbeat (>5 min)
2. **No Completed Job Check**: Didn't check if there's a more recent completed job
3. **Chunks Over Items**: Messages prioritized chunks over items synced, making it confusing
4. **No Hide Logic**: Stale jobs with 0 items synced weren't hidden when sync actually completed

## Fixes Applied

### 1. Check for Completed Jobs ✅
**File**: `hooks/use-pokepedia-sync.ts`

- When detecting stale job, also check for recent completed jobs
- If completed job is newer than stale job, ignore stale job and show completion status
- Prevents showing stale "Master: 1/47 chunks" when sync actually finished

### 2. Prioritize Items Synced Over Chunks ✅
**File**: `hooks/use-pokepedia-sync.ts`

**Before**:
- `"Syncing Master: 1/47 chunks (2.1%)"`
- Chunks shown first, items synced as secondary

**After**:
- `"Syncing Master: 1,350 items synced (1/47 chunks, 2.1%)"` - when items synced > 0
- `"Syncing Master: 1/47 chunks (2.1%)"` - when items synced = 0
- Items synced shown first, chunks as secondary detail

### 3. Hide Stale Jobs When Appropriate ✅
**File**: `hooks/use-pokepedia-sync.ts`

- If stale job has 0 items synced and is very old (>10 min), hide it
- If stale job has 0 items synced and 0 chunks processed, hide it after 5 min
- If there's a more recent completed job, ignore stale job entirely

### 4. Better UI Display ✅
**File**: `components/pokepedia-sync-provider.tsx`

- Items synced shown prominently when available
- Chunks only shown when items synced = 0 (early in sync)
- Better visual hierarchy

## Expected Behavior Now

### Scenario 1: Stale Job, Sync Actually Completed
- **Before**: Shows "Syncing Master: 1/47 chunks (2.1%)"
- **After**: Shows "Sync completed. 1,350 Pokemon available locally."

### Scenario 2: Active Sync with Items Synced
- **Before**: "Syncing Master: 15/47 chunks (32.0%)"
- **After**: "Syncing Master: 150 items synced (15/47 chunks, 32.0%)"

### Scenario 3: Active Sync, No Items Yet
- **Before**: "Syncing Master: 1/47 chunks (2.1%)"
- **After**: "Syncing Master: 1/47 chunks (2.1%)" (chunks shown since no items yet)

### Scenario 4: Stale Job, No Completed Job
- **Before**: "Syncing Master: 1/47 chunks (2.1%)"
- **After**: "Sync appears stopped (no update in Xmin). Last: Master phase (1/47 chunks)" or "Sync appears stopped (no update in Xmin). 1,350 items synced in Master phase"

## Files Modified

1. ✅ `hooks/use-pokepedia-sync.ts` - Added completed job check, prioritize items synced
2. ✅ `components/pokepedia-sync-provider.tsx` - Better UI display for items synced

---

**Status**: ✅ Fix complete - stale jobs now properly detected and hidden when sync completed
