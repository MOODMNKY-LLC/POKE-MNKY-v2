# Sync Banner Rebuild - Complete ✅

## Problem Solved

**Issue**: Banner showed "stopped" by default on app launch due to stale sync_jobs entries.

**Root Cause**: Banner displayed for stopped/idle/error states. Should ONLY show for active syncs.

## Solution Implemented

### 1. Minimal "Active Only" Banner ✅

**Display Logic**:
- **Show banner ONLY when**:
  - Status = "syncing" AND heartbeat < 2 minutes (truly active)
  - Status = "completed" AND progress = 100% (brief success, auto-hides after 5s)
  
- **Hide banner for**:
  - Stopped, idle, error states
  - Stale jobs (heartbeat >2 min)
  - Old completed jobs (>5s)

### 2. Simplified Banner UI ✅

**Before**: Complex banner with buttons, multiple states, refresh controls
**After**: Minimal notification:
- Status badge (Syncing/Completed)
- Progress bar (when syncing)
- Brief message
- Info button → opens comprehensive modal

**Removed**:
- Start/Retry buttons (available in modal)
- Stopped/Idle/Error states
- Refresh button
- Chunk details (available in modal)

### 3. Stricter Stale Detection ✅

**Changed**: Stale threshold from 5 minutes → 2 minutes for banner display
- Banner only shows syncs with heartbeat < 2 min
- More conservative - prevents false positives
- Stale jobs still tracked in comprehensive modal

### 4. On-Mount Behavior ✅

**Before**: `checkLocalStatus` found stale job → marked as "stopped" → banner showed
**After**: 
- Finds stale job → sets status to "idle" silently
- Banner doesn't show (idle state hidden)
- No "stopped" state on mount
- Details available in comprehensive modal

### 5. Auto-Hide Completed Banner ✅

- Completed banner shows for 5 seconds
- Then auto-hides
- Prevents banner from staying visible after sync completes

## Component Architecture

\`\`\`
PokepediaSyncProvider (app/layout.tsx)
├── Children (app content)
├── PokepediaSyncBanner (minimal, active only)
│   ├── Status badge
│   ├── Progress bar
│   ├── Brief message
│   └── Info button
└── PokepediaComprehensiveStatus (modal)
    ├── All sync jobs
    ├── Database counts
    ├── Health checks
    └── Manual triggers
\`\`\`

## Expected Behavior

### On App Launch
- **Before**: Shows "stopped" banner
- **After**: No banner (unless active sync happening)

### During Active Sync
- **Before**: Shows banner with progress
- **After**: Shows minimal banner with progress

### After Sync Completes
- **Before**: Shows "stopped" or stays visible
- **After**: Shows brief "completed" message, auto-hides after 5s

### Stale Jobs
- **Before**: Shows "stopped" banner
- **After**: No banner, details in modal

## Files Modified

1. ✅ `components/pokepedia-sync-provider.tsx` - Rebuilt banner with active-only logic
2. ✅ `hooks/use-pokepedia-sync.ts` - Stricter stale detection (2 min), silent idle on mount

## Key Changes

### Banner Display Logic
\`\`\`typescript
const isActiveSync = syncState.status === "syncing" && !syncState.isStale
const isJustCompleted = syncState.status === "completed" && syncState.progress === 100 && completedBannerVisible
const shouldShowBanner = isActiveSync || isJustCompleted
\`\`\`

### Stale Detection
\`\`\`typescript
// Banner: 2 minutes (stricter)
const isStale = minutesSinceHeartbeat > 2

// Cleanup: 10 minutes (database cleanup)
const isStale = minutesSinceHeartbeat > 10
\`\`\`

### On Mount
\`\`\`typescript
// Don't show "stopped" - just set to idle silently
status: needsSync ? "idle" : "completed"
// Banner won't show for idle/completed unless active
\`\`\`

---

**Status**: ✅ Rebuild complete - Banner now only shows for active syncs
