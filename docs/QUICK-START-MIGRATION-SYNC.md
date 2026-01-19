# Quick Start: Migration Sync for Other Machine

**For**: Machine 2 (where migrations are missing)  
**Time**: 2 minutes  
**Status**: Ready to execute

---

## ⚠️ IMPORTANT: Use `--status applied` (NOT `reverted`)

The error message suggests `--status reverted`, but that's **WRONG**.  
Use `--status applied` because migrations are already in production.

---

## Quick Steps

### 1. Pull Latest Changes

```bash
cd /path/to/POKE-MNKY
git pull origin master  # or main
```

### 2. Verify Migration Files Exist

```bash
ls -1 supabase/migrations/20260118*.sql supabase/migrations/20260119*.sql
# Should see 20+ migration files
```

### 3. Mark Migrations as Applied

**Option A: Use Script (Recommended)**
```bash
./scripts/mark-migrations-applied.sh
```

**Option B: Manual Commands**
```bash
supabase migration repair --status applied 20260118093937 --linked
supabase migration repair --status applied 20260118094133 --linked
supabase migration repair --status applied 20260119072730 --linked
supabase migration repair --status applied 20260119074102 --linked
supabase migration repair --status applied 20260119081827 --linked
supabase migration repair --status applied 20260119082412 --linked
supabase migration repair --status applied 20260119082530 --linked
supabase migration repair --status applied 20260119083400 --linked
supabase migration repair --status applied 20260119111702 --linked
supabase migration repair --status applied 20260119113545 --linked
supabase migration repair --status applied 20260119114000 --linked
supabase migration repair --status applied 20260119114500 --linked
supabase migration repair --status applied 20260119120000 --linked
supabase migration repair --status applied 20260119120100 --linked
supabase migration repair --status applied 20260119130000 --linked
```

### 4. Verify

```bash
supabase migration list --linked | tail -5
# Should show all migrations with both Local and Remote columns filled

supabase db pull --linked
# Should work without errors now
```

---

## Why This Works

- ✅ Migration files now exist locally (from git)
- ✅ Migrations already applied in production (schema matches)
- ✅ Marking as "applied" syncs history tracking
- ✅ No data loss (repair is metadata-only)

---

## Full Documentation

See `docs/MIGRATION-SYNC-FOR-MULTI-MACHINE.md` for detailed explanation.

---

**Last Updated**: 2026-01-19  
**Status**: Ready to execute on Machine 2
