# Pokemon Cache vs Comprehensive System Analysis

**Date:** 2026-01-14  
**Issue:** Empty `pokemon_cache` table in production

---

## 🔍 Current Situation

### Two Separate Systems Exist

#### 1. **`pokemon_cache` Table** (Old System - Currently Used)
- **Status**: Empty in production
- **Used By**: 
  - `lib/pokemon-utils.ts` - `getPokemon()`, `getAllPokemonFromCache()`, `searchPokemon()`
  - `lib/pokemon-api-enhanced.ts` - `getPokemonDataExtended()`
  - `lib/pokemon-api.ts` - `getPokemonData()`
  - `lib/draft-system.ts` - Draft pool queries
  - `lib/google-sheets-parsers/*` - Team/draft parsing
- **Structure**: Denormalized (single table with JSONB fields)
- **Data**: Basic info, stats, types, abilities, moves (limited), sprites, ability_details, move_details
- **Populated By**: 
  - Cron job: `/api/cron/sync-pokemon` (populates `pokemon_cache`)
  - `getPokemonDataExtended()` when `SUPABASE_SERVICE_ROLE_KEY` is available (server-side only)

#### 2. **`pokemon_comprehensive` Table** (New System - Synced But Not Used)
- **Status**: Being synced by sync component
- **Used By**: 
  - `lib/pokepedia-client.ts` - Offline-first client (uses `pokemon_comprehensive`)
  - `hooks/use-pokepedia-sync.ts` - Sync component (syncs to `pokemon_comprehensive`)
- **Structure**: Normalized (part of comprehensive schema with relationships)
- **Data**: Complete Pokemon data + relationships (types, abilities, moves, items, stats, etc.)
- **Populated By**: 
  - Sync component (`use-pokepedia-sync.ts`) - Syncs to `pokemon_comprehensive`
  - Edge Function: `sync-pokepedia` - Comprehensive sync

---

## 🎯 Root Cause Analysis

### Why `pokemon_cache` is Empty

1. **Client-Side Code Can't Cache**
   - `getPokemonDataExtended()` only caches when `SUPABASE_SERVICE_ROLE_KEY` is available
   - Client-side code doesn't have service role key (security)
   - So Pokemon fetched from PokeAPI are never cached

2. **Cron Job Not Running**
   - `/api/cron/sync-pokemon` exists but requires:
     - `CRON_SECRET` environment variable
     - Vercel cron configuration in `vercel.json`
   - May not be configured/triggered

3. **Sync Component Uses Different Table**
   - Sync component syncs to `pokemon_comprehensive`, not `pokemon_cache`
   - Two separate systems not connected

---

## 💡 Recommendation: Migrate to `pokepedia_pokemon` (Projection Table)

**UPDATE**: `pokepedia_pokemon` has data in production! This is the table we should use.

### Why Migrate?

1. **More Comprehensive Data**
   - `pokemon_comprehensive` has complete normalized data
   - Relationships (types, abilities, moves, items, stats)
   - Evolution chains, forms, species data

2. **Already Being Synced**
   - Sync component already populates `pokemon_comprehensive`
   - Edge functions sync to comprehensive system
   - No need for separate cache system

3. **Sprites in MinIO**
   - Sprites are served from MinIO (not Supabase Storage)
   - No need for sprite URLs in database
   - Just need sprite paths

4. **Better Architecture**
   - Normalized schema (better queries)
   - Relationships (efficient joins)
   - Complete data (all PokeAPI endpoints)

### Migration Plan

1. **Update Functions to Use `pokepedia_pokemon`**
   - `lib/pokemon-utils.ts` - Change from `pokemon_cache` to `pokepedia_pokemon`
   - `lib/pokemon-api-enhanced.ts` - Change from `pokemon_cache` to `pokepedia_pokemon`
   - `lib/draft-system.ts` - Change from `pokemon_cache` to `pokepedia_pokemon`
   - `lib/google-sheets-parsers/*` - Change from `pokemon_cache` to `pokepedia_pokemon`

2. **Map Data Structure**
   - `pokepedia_pokemon` has different field names:
     - `id` instead of `pokemon_id`
     - `sprite_front_default_path` instead of `sprites.front_default`
     - `types` (JSONB array) instead of `types[]`
     - `base_stats` (JSONB object) instead of `base_stats{}`
   - Create adapter functions to map between formats

3. **Handle Missing Fields**
   - `pokepedia_pokemon` may not have all fields that `pokemon_cache` has:
     - `ability_details[]` - May need to fetch from `pokeapi_resources` or `abilities` table
     - `move_details[]` - May need to fetch from `pokeapi_resources` or `moves` table
     - `draft_cost`, `tier` - League-specific fields, may need separate table

4. **Remove `pokemon_cache` Dependency**
   - After migration, remove `pokemon_cache` table (or keep as backup)
   - Remove cron job for `pokemon_cache`
   - Update documentation

---

## 🚀 Alternative: Keep Both Systems

If migration is too complex, we can:

1. **Populate `pokemon_cache` via API Route**
   - Use `/api/pokemon/populate-starters` to populate starter Pokemon
   - Keep using `pokemon_cache` for now
   - Migrate later when ready

2. **Fix Cron Job**
   - Ensure cron job is configured in Vercel
   - Set `CRON_SECRET` environment variable
   - Let cron job populate `pokemon_cache` automatically

---

## ❓ Questions to Answer

1. **Is `pokemon_comprehensive` populated in production?**
   - Check if sync component has run
   - Check if data exists in `pokemon_comprehensive`

2. **Do we need both systems?**
   - `pokemon_cache` - Simple, denormalized, currently used
   - `pokemon_comprehensive` - Complete, normalized, synced but not used

3. **Which system should we use?**
   - Recommendation: Migrate to `pokemon_comprehensive` (more complete)
   - Or: Keep `pokemon_cache` and populate it (simpler, less migration)

---

## 📋 Next Steps

1. **✅ Check Production Data** (COMPLETED)
   - ✅ `pokepedia_pokemon` has data
   - ✅ `pokemon_comprehensive` is empty
   - ✅ `pokemon_cache` is empty

2. **✅ Decide on Approach** (DECIDED)
   - ✅ **Migrate to `pokepedia_pokemon`** (has data, optimized for UI)

3. **Implement Solution** (NEXT)
   - Use Supabase MCP to investigate `pokepedia_pokemon` schema and data
   - Map field differences between `pokemon_cache` and `pokepedia_pokemon`
   - Update all functions to use `pokepedia_pokemon`
   - Test migration with starter Pokemon
   - Remove `pokemon_cache` dependency
