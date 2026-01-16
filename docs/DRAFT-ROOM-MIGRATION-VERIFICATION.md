# Draft Room Migration Verification

> **Status**: Migration `20260116000002` appears applied - Verification needed
> **Date**: 2026-01-16

---

## 🔍 Migration Status

According to `supabase migration list`, migration `20260116000002_enhance_draft_tracking.sql` shows as applied to both Local and Remote databases.

However, we should verify the actual database changes are present.

---

## ✅ Verification Queries

Run these queries in Supabase SQL Editor to verify the migration was applied:

### 1. Check `source` column exists
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'team_rosters' 
  AND column_name = 'source';
```

**Expected**: Should return one row with `source` column (TEXT, default 'draft')

### 2. Check `ownership_history` view exists
```sql
SELECT * FROM ownership_history LIMIT 5;
```

**Expected**: Should return rows (or empty if no draft picks yet)

### 3. Check function exists
```sql
SELECT proname, prorettype::regtype
FROM pg_proc
WHERE proname = 'get_pokemon_by_tier';
```

**Expected**: Should return function definition

### 4. Check triggers exist
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('draft_pick_broadcast', 'draft_turn_broadcast');
```

**Expected**: Should return 2 rows (one for each trigger)

---

## 🚀 If Migration Not Applied

If verification shows the migration wasn't applied, run it manually:

### Option 1: Supabase Dashboard SQL Editor (Recommended)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `supabase/migrations/20260116000002_enhance_draft_tracking.sql`
4. Paste and run
5. Verify no errors

### Option 2: Supabase CLI (if local)

```bash
# Check if migration is in local but not remote
supabase migration list

# If needed, mark as applied manually
supabase migration repair --status applied 20260116000002

# Or push to remote
supabase db push
```

---

## 🐛 Troubleshooting

### Error: Column already exists
**Solution**: Migration uses `IF NOT EXISTS`, so this is safe to ignore

### Error: View already exists
**Solution**: Migration uses `CREATE OR REPLACE`, so it will update if needed

### Error: Function already exists
**Solution**: Migration uses `CREATE OR REPLACE`, so it will update if needed

### Error: Trigger already exists
**Solution**: Drop existing triggers first:
```sql
DROP TRIGGER IF EXISTS draft_pick_broadcast ON team_rosters;
DROP TRIGGER IF EXISTS draft_turn_broadcast ON draft_sessions;
```
Then re-run migration.

---

## ✅ Next Steps After Verification

1. ✅ Verify all 4 checks pass
2. ✅ Test draft room page loads
3. ✅ Test Pokemon fetching
4. ✅ Test pick submission (when draft session exists)
5. ✅ Verify real-time updates work

---

**Status**: Ready for verification and testing
