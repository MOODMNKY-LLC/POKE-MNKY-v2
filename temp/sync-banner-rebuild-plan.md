# Sync Banner Rebuild Plan

## Problem Analysis

**Current Issue**: Banner shows "stopped" by default on app launch because:
1. On mount, `checkLocalStatus` finds stale sync_jobs entry
2. Detects heartbeat >5 min old
3. Immediately marks as "stopped" 
4. Banner shows stopped state (shouldn't show at all)

**Root Cause**: Banner logic shows for stopped/idle/error states. It should ONLY show for active syncs.

## Solution: Minimal "Active Only" Banner

### Design Philosophy
- **Banner**: Notification that sync is happening RIGHT NOW
- **Modal**: Comprehensive details, history, controls
- **Separation**: Banner = active sync only, Modal = everything

### Banner Display Logic

**Show banner ONLY when**:
- Status = "syncing" AND last_heartbeat < 2 minutes ago
- Status = "completed" AND completed_at < 5 minutes ago (brief success)

**Hide banner for**:
- Stopped, idle, error states
- Stale jobs (heartbeat >2 min)
- Old completed jobs (>5 min)
- No active sync

### Component Structure

\`\`\`
PokepediaSyncProvider (Context)
├── Children (app content)
├── PokepediaSyncBanner (minimal, active only)
│   ├── Status badge (Syncing/Completed)
│   ├── Progress bar (when syncing)
│   ├── Brief message
│   └── Info button → opens modal
└── PokepediaComprehensiveStatus (modal, all details)
    ├── All sync jobs (running/completed/failed)
    ├── Database counts
    ├── Health checks
    ├── Manual triggers
    └── Historical data
\`\`\`

### Hook Changes

**New hook structure**:
- `usePokepediaSync()` - Simplified, only tracks active syncs for banner
- `usePokepediaComprehensiveStatus()` - Already exists, tracks all data for modal
- Banner state: Only active syncs (<2 min heartbeat)
- Comprehensive state: All sync jobs, database counts, etc.

### Implementation Steps

1. **Rebuild Banner Component**
   - Remove stopped/idle/error display logic
   - Only render when active sync detected
   - Minimal UI: badge + progress + message + info button

2. **Update Hook Logic**
   - On mount: Check for active jobs only (heartbeat <2 min)
   - Don't mark as stopped on mount - just hide banner
   - Poll every 2s only when active sync detected

3. **Keep Modal As-Is**
   - Comprehensive status modal works fine
   - Shows all details including stale jobs
   - Accessible via info button

4. **Hook Location**
   - Stays in `app/layout.tsx` (correct)
   - Wraps entire app
   - Provides context to children

## Files to Modify

1. ✅ `components/pokepedia-sync-provider.tsx` - Rebuild banner logic
2. ✅ `hooks/use-pokepedia-sync.ts` - Simplify to active-only tracking
3. ✅ Keep `components/pokepedia-comprehensive-status.tsx` as-is

## Expected Behavior

### On App Launch
- **Before**: Shows "stopped" banner
- **After**: No banner (unless active sync happening)

### During Active Sync
- **Before**: Shows banner with progress
- **After**: Shows minimal banner with progress

### After Sync Completes
- **Before**: Shows "stopped" or stays visible
- **After**: Shows brief "completed" message, then hides after 5s

### Stale Jobs
- **Before**: Shows "stopped" banner
- **After**: No banner, details available in modal

---

**Status**: Ready to implement
