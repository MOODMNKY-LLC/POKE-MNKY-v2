# Sync Progress Debugging

**Issue**: Progress showing 3,818/15,040 (25.4%) but database shows only 14 resources synced.

## Root Cause

The `get_pokepedia_sync_progress()` function:
1. ✅ Uses **actual synced counts** from `pokeapi_resources` table (dynamic)
2. ⚠️ Uses **hardcoded estimates** for `total_estimated` (static)
3. ✅ Includes ALL expected resource types (even if not synced yet)

## Current State

**Database**: 14 resources synced (type: 14)  
**Function Output**: 14 synced / 15,340 estimated = 0.09%  
**UI Showing**: 3,818/15,040 = 25.4% (STALE DATA)

## Problem

The UI is showing **stale/cached data** (3,818) instead of the actual current count (14).

## Solution

1. ✅ Function is correct - uses actual synced counts
2. ✅ Component refreshes every 5 seconds
3. ⚠️ Need to verify component is actually calling the function
4. ⚠️ Need to check if there's browser caching

## Verification

The function returns:
- **Synced Count**: Actual count from `pokeapi_resources` ✅
- **Total Estimated**: Hardcoded estimates (15,340 total) ⚠️
- **Progress**: Calculated from above ✅

The estimates are reasonable but may not match actual PokeAPI totals exactly.

## Next Steps

1. Verify component is fetching fresh data
2. Check browser console for fetch errors
3. Add debug logging to component
4. Consider using actual PokeAPI counts instead of estimates
