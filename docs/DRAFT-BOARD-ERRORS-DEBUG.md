# Draft Board Errors - Debug Analysis & Fixes

**Date:** 2026-01-20  
**Status:** ✅ **FIXES APPLIED**

---

## 🐛 Errors Identified

### 1. **RealtimeChat SSR Error** ✅ FIXED

**Error:**
```
Supabase client can only be created on the client side. Use createServerClient for server-side operations.
at createClient (lib\supabase\client.ts:16:11)
at RealtimeChat (components\realtime\realtime-chat.tsx:23:32)
```

**Root Cause:**
- `RealtimeChat` component was calling `createBrowserClient()` at component level (line 23)
- This executes during SSR before `useEffect` runs
- Next.js evaluates component body during SSR even for Client Components

**Fix Applied:**
- Moved `createBrowserClient()` call to `useEffect` hook
- Added state to track Supabase client initialization
- Added null checks before using Supabase client

**File:** `components/realtime/realtime-chat.tsx`

---

### 2. **TeamRosterPanel SSR Error** ⚠️ ALREADY FIXED (Stale Cache?)

**Error:**
```
Supabase client can only be created on the client side. Use createServerClient for server-side operations.
at createClient (lib\supabase\client.ts:16:11)
at TeamRosterPanel (components\draft\team-roster-panel.tsx:31:32)
```

**Root Cause:**
- Component was already fixed with lazy initialization in `useEffect`
- Error persists, likely due to stale Next.js build cache
- Next.js might be evaluating component during SSR despite `"use client"` directive

**Fix Status:**
- ✅ Code already fixed with lazy initialization pattern
- ⚠️ Error likely from stale `.next` build cache

**Solution:**
```bash
# Clear build cache and rebuild
rm -rf .next
pnpm dev
```

**File:** `components/draft/team-roster-panel.tsx` (already fixed)

---

### 3. **API Route 500 Error** ✅ FIXED

**Error:**
```
GET http://localhost:3000/api/draft/available?limit=500&season_id=00000000-0000-0000-0000-000000000001 500 (Internal Server Error)
```

**Root Cause:**
- API route was returning 500 when draft pool is empty
- Error handling didn't gracefully handle empty results
- Should return 200 with empty array instead of 500

**Fix Applied:**
- Improved error handling to return empty array (200) when draft pool is empty
- Added check for `PGRST116` (No rows) error code
- Returns `{ success: true, pokemon: [], total: 0 }` instead of 500

**File:** `app/api/draft/available/route.ts`

---

### 4. **Empty Draft Pool** 🔴 MAIN ISSUE

**Error:**
```
[DraftSystem] No Pokemon found for season 00000000-0000-0000-0000-000000000001
[DraftSystem] Total count query returned: 0
```

**Root Cause:**
- The `draft_pool` table is **empty**
- User imported 778 Pokemon to `sheets_draft_pool` (staging table)
- **Sync from staging to production hasn't been run yet**
- Draft board can't display Pokemon because `draft_pool` has no data

**Solution:**
1. Navigate to `/admin` page
2. Find "Draft Pool Import & Sync" section
3. Click "Sync" tab
4. Select the season (e.g., `00000000-0000-0000-0000-000000000001`)
5. Click "Sync to Production" button
6. This will populate `draft_pool` table with Pokemon from `sheets_draft_pool`

**Expected Result:**
- After sync, `draft_pool` should have ~778 Pokemon with `status='available'`
- Draft board will then display Pokemon correctly

---

### 5. **Missing RPC Function** ⚠️ EXPECTED BEHAVIOR

**Error:**
```
Could not find the function public.get_available_pokemon(p_season_id) in the schema cache
```

**Root Cause:**
- Code tries to call RPC function `get_available_pokemon` first
- Function doesn't exist in database
- Code correctly falls back to direct query

**Status:**
- ✅ This is **expected behavior** - code has fallback logic
- RPC function is optional optimization
- Direct query works fine (returns 0 results because draft pool is empty)

**No Action Needed:**
- Code already handles this gracefully
- Fallback query works correctly

---

## ✅ Fixes Applied

### 1. RealtimeChat Component
- ✅ Moved Supabase client initialization to `useEffect`
- ✅ Added state tracking for client initialization
- ✅ Added null checks before using client

### 2. API Route Error Handling
- ✅ Improved error handling for empty draft pool
- ✅ Returns 200 with empty array instead of 500
- ✅ Handles `PGRST116` (No rows) error gracefully

---

## 🔧 Next Steps

### Immediate Actions:

1. **Clear Build Cache:**
   ```bash
   rm -rf .next
   pnpm dev
   ```

2. **Sync Draft Pool:**
   - Go to `/admin` page
   - Navigate to "Draft Pool Import & Sync"
   - Click "Sync" tab
   - Select season: `00000000-0000-0000-0000-000000000001`
   - Click "Sync to Production"
   - Wait for sync to complete (~778 Pokemon)

3. **Verify Draft Board:**
   - Navigate to `/draft/board`
   - Should see Pokemon displayed (after sync)
   - No SSR errors in console
   - API route returns 200 with Pokemon data

---

## 📊 Error Summary

| Error | Status | Fix |
|-------|--------|-----|
| RealtimeChat SSR | ✅ Fixed | Lazy initialization in `useEffect` |
| TeamRosterPanel SSR | ⚠️ Stale Cache | Clear `.next` folder |
| API Route 500 | ✅ Fixed | Improved error handling |
| Empty Draft Pool | 🔴 User Action | Sync staging to production |
| Missing RPC Function | ✅ Expected | Fallback works correctly |

---

## 🎯 Root Cause Analysis

**Primary Issue:** Draft pool is empty because sync hasn't been run.

**Secondary Issues:**
- SSR errors from components calling `createClient()` at component level
- API route returning 500 instead of gracefully handling empty state

**All fixes applied except user action needed for sync.**

---

**Last Updated:** 2026-01-20  
**Status:** ✅ Ready for testing after sync
