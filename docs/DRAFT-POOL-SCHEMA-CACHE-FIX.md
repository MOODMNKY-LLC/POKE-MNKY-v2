# Draft Pool Schema Cache Issue - Fix Applied

**Date:** 2026-01-20  
**Issue:** Schema cache error - `is_tera_banned` column not found  
**Status:** ✅ **MIGRATION RE-APPLIED**

---

## Issue Description

After running the validation script, errors occurred:
```
Could not find the 'is_tera_banned' column of 'sheets_draft_pool' in the schema cache
```

This affected 778 Pokemon records during import.

---

## Root Cause

The migration `20260120000001_add_is_tera_banned_to_staging.sql` may not have been applied to the database, or Supabase client's schema cache was stale.

---

## Fix Applied

### 1. Migration Re-Applied ✅
- Migration `add_is_tera_banned_to_staging_retry` applied successfully
- Column `is_tera_banned` added to `sheets_draft_pool` table
- Index created for performance
- Existing rows backfilled with `false` default

### 2. Verification ✅
- Column exists in database schema
- Column is accessible via SQL queries
- Default value set correctly (`false`)
- NOT NULL constraint applied

---

## Verification Steps

### Check Column Exists
```sql
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sheets_draft_pool'
  AND column_name = 'is_tera_banned';
```

**Expected Result:**
- Column name: `is_tera_banned`
- Data type: `boolean`
- Default: `false`
- Nullable: `NO`

### Check Data
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_tera_banned IS NULL) as null_count,
  COUNT(*) FILTER (WHERE is_tera_banned = true) as tera_banned_count
FROM public.sheets_draft_pool;
```

**Expected Result:**
- Total: 778 (or current count)
- Null count: 0 (all rows should have value)
- Tera banned count: 14 (after import)

---

## Next Steps

### 1. Clear Schema Cache (If Needed)

If errors persist, the Supabase client may have cached the old schema. Try:

**Option A: Restart Next.js Dev Server**
```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

**Option B: Clear Node Modules Cache**
```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

### 2. Re-run Validation Script

After clearing cache, re-run the validation script:
```bash
npx tsx scripts/validate-draft-pool-system.ts
```

**Expected:** All tests should pass without schema cache errors.

### 3. Re-run Import (If Needed)

If the import failed due to schema errors, you may need to:
1. Clear the staging table (optional):
   ```sql
   DELETE FROM public.sheets_draft_pool WHERE sheet_name = 'Draft Board';
   ```

2. Re-run the import via UI or script

---

## Prevention

To prevent this issue in the future:

1. **Always apply migrations before running scripts**
   ```bash
   # Check migrations status
   supabase migration list
   
   # Apply pending migrations
   supabase migration up
   ```

2. **Verify schema after migrations**
   ```sql
   -- Check columns exist
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'sheets_draft_pool';
   ```

3. **Restart dev server after schema changes**
   - Schema cache is refreshed on server restart
   - Ensures client libraries pick up new columns

---

## Status

✅ **Migration Applied**
- Column `is_tera_banned` exists
- Index created
- Data backfilled

✅ **Ready for Re-testing**
- Schema cache should be cleared
- Validation script should pass
- Import should work correctly

---

**Fix Applied:** 2026-01-20  
**Migration Status:** ✅ Applied  
**Column Status:** ✅ Verified  
**Ready for Testing:** ✅ Yes
