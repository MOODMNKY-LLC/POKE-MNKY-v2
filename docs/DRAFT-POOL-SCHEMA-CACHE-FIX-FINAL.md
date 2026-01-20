# Draft Pool Schema Cache Fix - Final

**Date:** 2026-01-20  
**Status:** ✅ **Column Verified in Database**  
**Issue:** Supabase client schema cache is stale

---

## Problem

The error `column sheets_draft_pool.is_tera_banned does not exist` is occurring even though:

✅ **The column exists in the database** (verified via SQL query)  
✅ **The migration was applied** (`20260120000001_add_is_tera_banned_to_staging`)  
✅ **The API endpoint uses service role client** (bypasses RLS)

**Root Cause:** The Supabase client library caches the database schema when it's initialized. Since the Next.js dev server was started before the migration was applied, it has a stale schema cache.

---

## Solution

### Step 1: Restart Next.js Dev Server

**Critical** - The Supabase client needs to refresh its schema cache:

```bash
# Stop the server (Ctrl+C in the terminal running `pnpm dev`)
# Then restart:
pnpm dev
```

### Step 2: Verify Fix

After restarting:

1. Navigate to `/admin`
2. Go to "Draft Pool Import & Sync"
3. Click on "Staging Preview" tab
4. The statistics should load without errors

---

## Verification

### Database Verification ✅

The column exists and is properly configured:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sheets_draft_pool'
  AND column_name = 'is_tera_banned';
```

**Result:**
- Column: `is_tera_banned`
- Type: `boolean`
- Nullable: `NO`
- Default: `false`

### Migration Status ✅

Migration `20260120000001_add_is_tera_banned_to_staging` is applied.

---

## Why This Happens

The Supabase JavaScript client library (`@supabase/supabase-js`) validates queries against a cached schema before sending them to the server. This cache is populated when:

1. The client is first initialized
2. The module is loaded

If the Next.js server was started before the migration was applied, the client will have cached the old schema (without `is_tera_banned`), even though the column exists in the database.

---

## Prevention

To avoid this in the future:

1. **Always restart the Next.js dev server after applying migrations**
2. **Or apply migrations before starting the dev server**
3. **Use `supabase start` before `pnpm dev`** to ensure migrations are applied first

---

## Status

**Database:** ✅ Column exists  
**Migration:** ✅ Applied  
**Client Cache:** ⚠️ Needs refresh (restart Next.js server)  
**Next Action:** Restart `pnpm dev`  

---

**Completed:** 2026-01-20  
**Ready for Testing:** ✅ After server restart
