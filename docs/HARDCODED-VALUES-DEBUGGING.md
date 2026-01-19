# Hardcoded Values Debugging Guide

## Problem
UI showing 25.4% (3,818/15,040) but database function returns 100% (14/14).

## Root Cause Analysis

### Database Function Status
✅ **Function is CORRECT** - Returns 14/14 = 100% (no hardcoded values)
- Function uses `pokepedia_resource_totals` table (empty, so falls back to synced_count)
- No hardcoded CASE statements with values like 1025, 1000, etc.

### Possible Issues

1. **Browser Cache** - Old RPC response cached
2. **React State** - Component state not updating
3. **Different Component** - User might be looking at a different component
4. **Stale Data** - Old sync data still in database

## Debugging Steps

### Step 1: Check Browser Console
Open browser DevTools → Console and look for:
- `🔍 [Sync Status] CRITICAL DEBUG - Data received:`
- `📊 [Sync Status] Display calculation:`
- `🚨 ALERT: Suspiciously high total_estimated detected:`

### Step 2: Verify Database
Run this SQL:
```sql
SELECT 
  SUM(synced_count) as total_synced,
  SUM(total_estimated) as total_estimated,
  ROUND((SUM(synced_count)::NUMERIC / NULLIF(SUM(total_estimated), 0)::NUMERIC) * 100, 2) as percent
FROM get_pokepedia_sync_progress();
```

**Expected**: 14 / 14 = 100%
**If different**: Function might not be updated

### Step 3: Clear Browser Cache
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache completely
3. Check Network tab → Disable cache

### Step 4: Check Component State
The component logs:
- What it receives from database
- What it calculates for display
- Any mismatches

## Solution Applied

1. ✅ Removed ALL hardcoded values from function
2. ✅ Added extensive debug logging
3. ✅ Component refreshes every 5 seconds
4. ✅ Added alerts for suspicious values

## Next Steps

1. **Check browser console** - See what data component is receiving
2. **Hard refresh** - Clear browser cache
3. **Verify database** - Confirm function returns correct values
4. **Report findings** - Share console logs if issue persists
