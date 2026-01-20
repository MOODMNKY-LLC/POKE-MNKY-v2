# Draft Pool Migration Applied - is_tera_banned Column

**Date:** 2026-01-20  
**Status:** ✅ **MIGRATION APPLIED SUCCESSFULLY**

---

## Migration Applied

**Migration:** `20260120000026_ensure_is_tera_banned_column.sql`

This migration ensures the `is_tera_banned` column exists in `sheets_draft_pool` with correct properties, even if it was manually added.

---

## What the Migration Does

1. **Checks if column exists** - Uses `DO $$` block to check before adding
2. **Adds column if missing** - Creates with `BOOLEAN DEFAULT false NOT NULL`
3. **Ensures correct default** - Sets default to `false`
4. **Ensures NOT NULL constraint** - Handles case where column was manually added as nullable
5. **Backfills NULL values** - Sets any NULL values to `false`
6. **Creates index** - Creates partial index for filtering Tera banned Pokemon
7. **Adds comment** - Documents the column purpose

---

## Verification

✅ **Column exists** - `is_tera_banned` (boolean, NOT NULL, default: false)  
✅ **Index exists** - `idx_sheets_draft_pool_tera_banned`  
✅ **Migration applied** - Safe to run in production

---

## Next Steps

1. **Restart Next.js dev server** to refresh Supabase client schema cache:
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```

2. **Test import again** - The import should now work without schema cache issues

3. **Verify in production** - When deploying, this migration will ensure the column exists

---

## Migration Details

**File:** `supabase/migrations/20260120000026_ensure_is_tera_banned_column.sql`

**Idempotent:** ✅ Yes - Safe to run multiple times  
**Backward Compatible:** ✅ Yes - Won't break existing data  
**Production Ready:** ✅ Yes - Handles all edge cases

---

**Completed:** 2026-01-20  
**Status:** ✅ Migration Applied  
**Ready for Testing:** ✅ Yes (after server restart)
