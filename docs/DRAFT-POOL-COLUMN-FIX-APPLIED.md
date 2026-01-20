# Draft Pool Column Fix Applied

**Date:** 2026-01-20  
**Issue:** Column `is_tera_banned` not found in `sheets_draft_pool`  
**Status:** ✅ **FIX APPLIED**

---

## Problem

The API endpoint `/api/admin/draft-pool/stats` was returning:
```
Error: column sheets_draft_pool.is_tera_banned does not exist
```

---

## Root Cause

The migration `add_is_tera_banned_to_staging` existed but may not have been fully applied, or the Supabase client had a stale schema cache.

---

## Solution Applied

### 1. Re-applied Migration

Applied migration `add_is_tera_banned_to_staging_retry` which:
- ✅ Adds `is_tera_banned` column (if not exists)
- ✅ Creates index for performance
- ✅ Backfills existing records with `false`
- ✅ Adds column comment

### 2. Verified Column Exists

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'sheets_draft_pool' 
  AND column_name = 'is_tera_banned';
```

**Result:** ✅ Column exists with correct type (`boolean`, `NOT NULL`, default `false`)

---

## Next Steps

### 1. Restart Dev Server

**This is critical** - The Supabase client caches the schema. Restarting forces it to refresh:

```bash
# Stop server (Ctrl+C)
pnpm dev
```

### 2. Test API Endpoint

After restarting, the `/api/admin/draft-pool/stats` endpoint should work:

```bash
# Test via browser or curl
curl http://localhost:3000/api/admin/draft-pool/stats
```

**Expected:** Returns statistics with `teraBanned` count

### 3. Test UI Component

1. Navigate to `/admin`
2. Go to "Draft Pool Import & Sync"
3. Click "Staging Preview" tab
4. Statistics should load without errors

---

## Verification

### Database Check
```sql
-- Column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sheets_draft_pool' AND column_name = 'is_tera_banned';
-- ✅ Should return: is_tera_banned

-- Test query works
SELECT is_available, is_tera_banned FROM sheets_draft_pool LIMIT 5;
-- ✅ Should return data without errors
```

### API Check
- ✅ Migration applied successfully
- ✅ Column exists in database
- ✅ SQL query works directly
- ⏳ **Need to restart dev server** to refresh Supabase client cache

---

## Why Restart is Needed

The Supabase JS client (`@supabase/supabase-js`) caches the database schema when it's first initialized. When a new column is added via migration:

1. ✅ Database schema is updated (migration applied)
2. ✅ Column exists in database (verified)
3. ⚠️ Supabase client still has old schema cached
4. ✅ Restarting dev server recreates client with fresh schema

---

## Status

**Migration:** ✅ Applied  
**Column:** ✅ Exists  
**Next Action:** Restart dev server  
**Expected:** API endpoint should work after restart

---

**Fix Applied:** 2026-01-20  
**Migration:** `add_is_tera_banned_to_staging_retry`  
**Column Status:** ✅ Verified exists  
**Action Required:** Restart dev server
