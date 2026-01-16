# Pokemon Stats Kills Column Fix

> **Status**: ✅ Complete
> **Date**: 2026-01-16

---

## 🐛 Issue

**Problem**: Home page (`app/page.tsx`) was showing warning:
```
[v0] Pokemon stats table doesn't have kills column - skipping top pokemon
```

**Root Cause**: 
- The `pokemon_stats` table exists but the `kills` column was missing
- The table was created in `20260112104004_create_schema.sql` with `kills INTEGER DEFAULT 0`
- However, a later migration (`20260112000003_create_comprehensive_pokedex.sql`) may have created a different `pokemon_stats` table structure
- The home page code expected `kills` column to exist for aggregating top Pokemon by KOs

---

## ✅ Solution

### 1. Created Migration to Add Missing Column

**File**: `supabase/migrations/20260116000006_add_pokemon_stats_kills_column.sql`

- Checks if `pokemon_stats` table exists with `match_id` column (match stats version)
- Adds `kills INTEGER DEFAULT 0` column if it doesn't exist
- Uses conditional logic to handle different table structures

### 2. Updated Home Page Logic

**File**: `app/page.tsx`

- Updated Pokemon stats aggregation to properly calculate:
  - `kos_scored`: Total kills across all matches
  - `times_used`: Number of matches the Pokemon was used
- Changed from simple mapping to aggregation logic:
  ```typescript
  // Aggregate kills per Pokemon
  const pokemonKills = new Map<string, { kills: number; matches: number; pokemon: any }>()
  
  result.data.forEach((stat: any) => {
    const pokemonId = stat.pokemon_id
    if (!pokemonKills.has(pokemonId)) {
      pokemonKills.set(pokemonId, {
        kills: 0,
        matches: 0,
        pokemon: pokemonDataResult.data?.find((p: any) => p.id === pokemonId) || null,
      })
    }
    const current = pokemonKills.get(pokemonId)!
    current.kills += stat.kills || 0
    current.matches += 1
  })
  
  // Convert to array and sort by kills
  topPokemon = Array.from(pokemonKills.values())
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 3)
    .map((stat) => ({
      pokemon_name: stat.pokemon?.name || "Unknown",
      kos_scored: stat.kills,
      times_used: stat.matches,
      pokemon: stat.pokemon,
    }))
  ```

### 3. Fixed Remote Schema Migration

**File**: `supabase/migrations/20260116080225_remote_schema.sql`

- Wrapped all `free_agency_transactions` and `team_transaction_counts` operations in conditional checks
- Prevents errors when tables don't exist locally

---

## 📋 Changes Made

1. ✅ Created migration to add `kills` column to `pokemon_stats` table
2. ✅ Updated home page to aggregate Pokemon stats correctly
3. ✅ Fixed remote schema migration to handle missing tables gracefully
4. ✅ Applied migrations to both local and remote databases

---

## ✅ Expected Behavior Now

1. **If `pokemon_stats` table has `kills` column**:
   - Home page fetches Pokemon stats with kills
   - Aggregates kills per Pokemon across all matches
   - Shows top 3 Pokemon by total KOs scored
   - Displays `kos_scored` and `times_used` correctly

2. **If `pokemon_stats` table doesn't have `kills` column**:
   - Migration adds the column automatically
   - Home page will work after migration is applied

---

## 🔍 Verification

Run these commands to verify:

```bash
# Check migration status
supabase migration list

# Verify column exists
supabase db pull --schema public
```

---

**Status**: ✅ Fixed - Pokemon Stats Kills Column Added and Home Page Updated
