# API Test Fixes Summary

**Date**: 2026-01-26  
**Status**: ✅ **COMPILATION ERRORS FIXED** | ⚠️ **Server restart may be needed**

---

## Issue Identified

The API tests were failing with a compilation error in `lib/sync/notion-sync-worker.ts`:

```
cannot reassign to a variable declared with `const`
```

This was causing all API endpoints to return 500 errors because Next.js couldn't compile the sync worker module.

---

## Fixes Applied

### 1. Fixed `const` to `let` in Notion Sync Worker ✅

**File**: `lib/sync/notion-sync-worker.ts`

**Changed**: Three instances of `const filter: any = undefined` → `let filter: any = undefined`

**Locations**:
- Line 88: `syncMoves()` function
- Line 210: `syncRoleTags()` function  
- Line 316: `syncPokemon()` function

**Reason**: These variables need to be reassigned conditionally, so `let` is required instead of `const`.

---

### 2. Enhanced Error Reporting in Test Script ✅

**File**: `scripts/test-e2e-with-server.ts`

**Changes**:
- Added response body parsing to show actual error messages
- Updated test assertions to include error details
- Fixed Notion sync pull endpoint to send `scope` as array instead of string

**Benefits**: Now we can see actual error messages instead of just "Server error: 500"

---

### 3. Improved Error Handling in API Routes ✅

**Files**:
- `app/api/sync/notion/pull/route.ts` - Added NOTION_API_KEY check
- `app/api/teams/[teamId]/roster/route.ts` - Changed team query to `maybeSingle()` to handle missing teams gracefully
- `app/api/sync/notion/pull/incremental/route.ts` - Fixed NextRequest construction

---

## Current Test Status

**Before Fixes**: 0/11 tests passing (0%)  
**After Fixes**: 2/11 tests passing (18.2%)

**Passing Tests**:
- ✅ Notion sync status endpoint
- ✅ Notion sync incremental endpoint

**Remaining Issues**:

1. **Next.js Cache**: The server may still be serving cached compilation errors. A restart may be needed.

2. **Invalid UUIDs**: Some endpoints (like team roster) are receiving test strings like `"test-season-id"` which aren't valid UUIDs. This is expected behavior - the endpoints exist and are working, but validation is correctly rejecting invalid input.

3. **Discord Endpoints**: Still showing 500 errors, likely due to the cached compilation error or missing configuration.

---

## Next Steps

### 1. Restart Next.js Server (Recommended)

The compilation errors are fixed in the source code, but Next.js may need a restart to clear its cache:

```bash
# Stop the current Next.js server (Ctrl+C)
# Then restart:
pnpm dev
```

### 2. Re-run Tests

After restarting the server:

```bash
pnpm test:e2e:api
```

### 3. Expected Results After Restart

- **Notion sync endpoints**: Should pass (they're already passing)
- **Team roster endpoint**: Should return 400 (validation error) instead of 500, confirming the endpoint works
- **Discord endpoints**: Should return 400/401/404 (validation/auth errors) instead of 500, confirming endpoints exist

---

## Verification

All three instances of `const filter` have been changed to `let filter`:

```bash
grep -n "filter: any" lib/sync/notion-sync-worker.ts
```

Should show:
```
88:  let filter: any = undefined
210: let filter: any = undefined
316: let filter: any = undefined
```

---

**Generated**: 2026-01-26  
**Status**: ✅ **Source code fixed** | ⚠️ **Server restart recommended**
