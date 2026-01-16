# Draft Room Migration Guide

> **Status**: ✅ Migration Ready - Instructions Below
> **Migration**: `20260116000002_enhance_draft_tracking.sql`

---

## 📋 Migration Overview

This migration enhances draft tracking by:
1. Adding `source` tracking to `team_rosters` (draft/free_agency/trade)
2. Creating `ownership_history` view for unified ownership tracking
3. Creating helper function `get_pokemon_by_tier()`
4. Creating real-time broadcast triggers

---

## 🚀 How to Run Migration

### Option 1: Supabase Dashboard (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260116000002_enhance_draft_tracking.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify no errors

### Option 2: Supabase CLI

```bash
# If linked to project
supabase db push

# Or apply specific migration
supabase migration up 20260116000002_enhance_draft_tracking
```

### Option 3: Direct SQL Execution

If you have database access:
```sql
-- Copy and paste the entire migration file content
-- Run in your SQL client (pgAdmin, DBeaver, etc.)
```

---

## ✅ Verification Queries

After running migration, verify with these queries:

### 1. Check `source` column exists
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'team_rosters' AND column_name = 'source';
```

### 2. Check `ownership_history` view exists
```sql
SELECT * FROM ownership_history LIMIT 5;
```

### 3. Check function exists
```sql
SELECT proname, prorettype::regtype
FROM pg_proc
WHERE proname = 'get_pokemon_by_tier';
```

### 4. Check triggers exist
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('draft_pick_broadcast', 'draft_turn_broadcast');
```

---

## 🔧 Migration Details

### Changes Made

1. **`team_rosters` table**
   - Added `source` column (TEXT, default 'draft')
   - Constraint: CHECK (source IN ('draft', 'free_agency', 'trade'))

2. **`ownership_history` view**
   - Combines draft picks and FA transactions
   - Shows: pokemon_id, team_id, source, draft_round, acquired_at

3. **`get_pokemon_by_tier()` function**
   - Returns Pokemon by point tier
   - Joins `draft_pool` with `pokemon_cache`
   - Returns: pokemon_name, point_value, generation, pokemon_cache_id

4. **Broadcast Triggers**
   - `draft_pick_broadcast`: Broadcasts when picks are made
   - `draft_turn_broadcast`: Broadcasts when turn changes

---

## ⚠️ Important Notes

1. **Backward Compatible**: Existing `team_rosters` rows get `source = 'draft'` by default
2. **No Data Loss**: All existing data is preserved
3. **Real-time Enabled**: Triggers enable real-time updates for draft room
4. **Permissions**: View and function are granted to `authenticated` role

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

**Status**: ✅ Migration Ready - Run via Supabase Dashboard or CLI
