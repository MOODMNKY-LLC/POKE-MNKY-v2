# Pokemon Stats Table Conflict Fix

> **Date**: 2026-01-16  
> **Status**: ✅ Fixed

---

## 🐛 Problem

**Error**: `[v0] Pokemon stats table doesn't have kills column - skipping top pokemon`

**Root Cause**: 
- Two different `pokemon_stats` tables were created with conflicting schemas:
  1. **Comprehensive Pokedex version** (from `20260112000003_create_comprehensive_pokedex.sql`):
     - Schema: `pokemon_id INTEGER`, `stat_id INTEGER`, `base_stat INTEGER`
     - Purpose: Pokemon base stats (HP, Attack, Defense, etc.)
  
  2. **Match Stats version** (from `20260112104004_create_schema.sql`):
     - Schema: `match_id UUID`, `pokemon_id UUID`, `kills INTEGER`
     - Purpose: Match statistics (KOs per Pokemon per match)

- The comprehensive pokedex migration ran **first** and created `pokemon_stats`
- The match stats migration used `CREATE TABLE IF NOT EXISTS`, so it didn't create the table
- The home page query expected `kills` column but it didn't exist

---

## ✅ Solution

**Migration**: `20260116000010_fix_pokemon_stats_table_conflict.sql`

**Actions**:
1. **Renamed** comprehensive pokedex `pokemon_stats` → `pokemon_base_stats`
2. **Created** match stats `pokemon_stats` table with correct schema:
   - `id UUID PRIMARY KEY`
   - `match_id UUID` (references `matches.id`)
   - `pokemon_id UUID` (references `pokemon.id`)
   - `team_id UUID` (references `teams.id`)
   - `kills INTEGER DEFAULT 0`
   - `created_at TIMESTAMPTZ`

3. **Created indexes**:
   - `idx_pokemon_stats_match` on `match_id`
   - `idx_pokemon_stats_pokemon` on `pokemon_id`
   - `idx_pokemon_stats_team` on `team_id`

4. **Set up RLS policies**:
   - Public read access
   - Authenticated insert access

---

## 📊 Result

**Before**:
- `pokemon_stats` table had wrong schema (base stats, no `kills` column)
- Home page query failed with error code `42703` (column doesn't exist)
- Top Pokemon section didn't display

**After**:
- `pokemon_base_stats` table: Base stats (HP, Attack, etc.)
- `pokemon_stats` table: Match statistics (kills per match)
- Home page query works correctly
- Top Pokemon section displays when data exists

---

## 🔍 Verification

```sql
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pokemon_stats' 
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- match_id (uuid)
-- pokemon_id (uuid)
-- team_id (uuid)
-- kills (integer)
-- created_at (timestamp with time zone)
```

---

## 📝 Notes

- The comprehensive pokedex `pokemon_stats` was renamed to `pokemon_base_stats` to avoid conflicts
- Both tables can coexist:
  - `pokemon_base_stats`: Pokemon base stats (HP, Attack, Defense, etc.)
  - `pokemon_stats`: Match performance statistics (kills per match)
- The home page query now works correctly with the match stats table

---

**Status**: ✅ Fixed - Table conflict resolved, query works correctly
