# Draft Pokemon Data Sources

> **Status**: Enhanced with Pokemon ID Support
> **Date**: 2026-01-16

---

## Current Implementation

### Data Flow

1. **Draft Pool** (`draft_pool` table):
   - Source: Extracted from Google Sheets Draft Board
   - Fields: `pokemon_name`, `point_value`, `generation`, `pokemon_id` (NEW)
   - Parser: `lib/google-sheets-parsers/draft-pool-parser.ts`

2. **Pokemon Cache** (`pokemon_cache` table):
   - Source: PokeAPI via Pokenode-TS (populated separately)
   - Fields: `pokemon_id`, `name`, `types`, `generation`, `sprites`, etc.
   - Used for: Enriching draft pool with `pokemon_id` and `generation`

3. **Draft System** (`lib/draft-system.ts`):
   - Returns: `pokemon_name`, `point_value`, `generation`, `pokemon_id`
   - API: `/api/draft/available`

4. **UI Components**:
   - `DraftBoard` → `PointTierSection` → `DraftPokemonCard` → `PokemonSprite`
   - Now passes `pokemon_id` through the chain

---

## Pokemon Sprite Display

### PokemonSprite Component

**Priority Order**:
1. **Provided `sprite` prop** (if explicitly passed)
2. **GitHub PokeAPI/sprites repo** (when `pokemonId` available) ← **PRIMARY SOURCE**
   - URL: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`
   - Works best when `pokemon_id` is provided
3. **Supabase Storage paths** (from `pokepedia_pokemon` table)
4. **External URLs** (from sprites JSONB)

### Current Status

✅ **Enhanced**: Draft pool now includes `pokemon_id` column
✅ **Enhanced**: Parser enriches draft pool with `pokemon_id` from `pokemon_cache`
✅ **Enhanced**: Components pass `pokemon_id` to `PokemonSprite`
✅ **Result**: Sprites should display reliably using GitHub PokeAPI/sprites URLs

---

## Pokenode-TS Usage

### Where It's Used

✅ **Pokédex Page** (`app/pokedex/page.tsx`):
- Uses `PokemonClient` from `pokenode-ts`
- Fetches detailed Pokemon data for Pokédex display
- Gets species data, evolution chains, etc.

❌ **Draft Board** (`components/draft/draft-board.tsx`):
- **NOT using Pokenode-TS directly**
- Uses `pokemon_cache` table (populated by Pokenode-TS elsewhere)
- Uses GitHub PokeAPI/sprites repo URLs for sprites

### Why Not Direct Pokenode-TS in Draft?

1. **Performance**: Draft board displays 500+ Pokemon
2. **Caching**: `pokemon_cache` table provides fast lookups
3. **Offline Support**: Cached data works without API calls
4. **Sprite URLs**: GitHub CDN is faster than PokeAPI for images

---

## Data Sources Summary

| Component | Data Source | Pokemon ID | Sprites |
|-----------|-------------|------------|---------|
| **Draft Pool** | Google Sheets | ✅ (from cache) | Via `pokemon_id` |
| **Pokemon Cache** | PokeAPI (Pokenode-TS) | ✅ Primary | Via `pokemon_id` |
| **PokemonSprite** | GitHub PokeAPI/sprites | ✅ (if provided) | Direct URLs |
| **Draft Board** | `draft_pool` table | ✅ (now included) | Via `PokemonSprite` |

---

## Enhancements Made

### 1. Database Schema
- ✅ Added `pokemon_id` column to `draft_pool` table
- ✅ Migration: `20260116000009_add_pokemon_id_to_draft_pool.sql`
- ✅ Auto-populates existing rows via name matching

### 2. Parser Enhancement
- ✅ `DraftPoolParser` now fetches `pokemon_id` from `pokemon_cache`
- ✅ Enriches draft pool entries with Pokemon IDs
- ✅ Stores `pokemon_id` when inserting to database

### 3. Component Updates
- ✅ `DraftSystem.getAvailablePokemon()` returns `pokemon_id`
- ✅ `DraftBoard` passes `pokemon_id` to child components
- ✅ `DraftPokemonCard` receives and passes `pokemon_id` to `PokemonSprite`
- ✅ `PokemonSprite` uses `pokemonId` for GitHub sprite URLs

---

## Next Steps

1. **Re-run Draft Pool Parser**:
   ```bash
   pnpm exec tsx scripts/test-draft-pool-parser.ts
   ```
   This will populate `pokemon_id` for all draft pool entries.

2. **Verify Sprites Display**:
   - Navigate to `/draft`
   - Check that Pokemon sprites load correctly
   - Verify sprites use GitHub PokeAPI/sprites URLs

3. **Populate Pokemon Cache** (if empty):
   - Ensure `pokemon_cache` has data
   - Parser needs cache to match names to IDs

---

## Architecture Decision

**Why GitHub PokeAPI/sprites instead of direct PokeAPI calls?**

1. **Performance**: GitHub CDN is faster than PokeAPI
2. **Reliability**: GitHub URLs are more stable
3. **Caching**: Browser/CDN caching works better
4. **No API Limits**: GitHub doesn't rate limit like PokeAPI
5. **Offline Support**: Can cache sprites locally

**Trade-off**: Requires `pokemon_id` to construct URLs, but this is now provided via `pokemon_cache` enrichment.

---

**Status**: ✅ Enhanced with Pokemon ID Support - Ready for Testing
