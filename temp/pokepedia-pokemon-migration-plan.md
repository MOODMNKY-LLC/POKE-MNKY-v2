# Migration Plan: pokemon_cache → pokepedia_pokemon

**Date:** 2026-01-14  
**Status:** Planning Phase  
**Goal:** Migrate all Pokemon data queries from `pokemon_cache` to `pokepedia_pokemon`

---

## 🔍 Schema Comparison

### `pokemon_cache` (Current - Empty)
```typescript
{
  pokemon_id: number,           // Primary key
  name: string,
  types: string[],              // Array of type names
  base_stats: {                 // Object with stat values
    hp: number,
    attack: number,
    defense: number,
    "special-attack": number,
    "special-defense": number,
    speed: number
  },
  abilities: string[],           // Array of ability names
  moves: string[],              // Array of move names
  sprites: {                    // Object with sprite URLs
    front_default: string,
    front_shiny: string,
    back_default: string,
    back_shiny: string,
    official_artwork: string,
    // ... more variants
  },
  ability_details: Array<{      // Detailed ability info
    name: string,
    effect: string,
    short_effect: string,
    // ...
  }>,
  move_details: Array<{         // Detailed move info
    name: string,
    power: number,
    accuracy: number,
    pp: number,
    type: string,
    // ...
  }>,
  generation: number,
  draft_cost: number,            // League-specific
  tier: string,                 // League-specific
  fetched_at: timestamp,
  expires_at: timestamp
}
```

### `pokepedia_pokemon` (Target - Has Data ✅)
```typescript
{
  id: number,                    // Primary key (same as pokemon_id)
  name: string,
  species_name: string,
  height: number,                // in decimeters
  weight: number,                // in hectograms
  base_experience: number,
  is_default: boolean,
  
  // Sprite paths (not URLs)
  sprite_front_default_path: string,
  sprite_official_artwork_path: string,
  
  // Expanded fields (from migration 20260113030001)
  types: JSONB,                  // Array: ["grass", "poison"]
  type_primary: string,
  type_secondary: string | null,
  base_stats: JSONB,             // Object: {hp, attack, defense, special_attack, special_defense, speed}
  total_base_stat: number,
  abilities: JSONB,              // Array: [{name, is_hidden, slot}]
  ability_primary: string,
  ability_hidden: string | null,
  order: number,                 // National Dex order
  generation: number,
  cry_latest_path: string,
  cry_legacy_path: string,
  moves_count: number,
  forms_count: number,
  
  // Timestamps
  updated_at: timestamp,
  created_at: timestamp
}
```

---

## 🔄 Field Mapping

| pokemon_cache | pokepedia_pokemon | Notes |
|--------------|-------------------|-------|
| `pokemon_id` | `id` | Same value, different name |
| `name` | `name` | Direct mapping |
| `types[]` | `types` (JSONB) | Array → JSONB array |
| `base_stats{}` | `base_stats` (JSONB) | Object → JSONB object |
| `abilities[]` | `abilities` (JSONB) | Array → JSONB array with objects |
| `sprites.front_default` | `sprite_front_default_path` | URL → Storage path |
| `sprites.official_artwork` | `sprite_official_artwork_path` | URL → Storage path |
| `generation` | `generation` | Direct mapping |
| `ability_details[]` | ❌ **MISSING** | Need to fetch from `abilities` table or `pokeapi_resources` |
| `move_details[]` | ❌ **MISSING** | Need to fetch from `moves` table or `pokeapi_resources` |
| `moves[]` | ❌ **MISSING** | Only `moves_count` available |
| `draft_cost` | ❌ **MISSING** | League-specific, may need separate table |
| `tier` | ❌ **MISSING** | League-specific, may need separate table |
| `expires_at` | ❌ **MISSING** | No expiration in projection table |

---

## 📋 Migration Strategy

### Phase 1: Create Adapter Functions

Create utility functions to:
1. **Map `pokepedia_pokemon` → `PokemonDisplayData` format**
2. **Handle missing fields gracefully**
3. **Fetch additional data when needed**

### Phase 2: Update Core Functions

Update these files to use `pokepedia_pokemon`:
- `lib/pokemon-utils.ts` - `getPokemon()`, `getAllPokemonFromCache()`, `searchPokemon()`
- `lib/pokemon-api-enhanced.ts` - `getPokemonDataExtended()`
- `lib/draft-system.ts` - Draft pool queries
- `lib/google-sheets-parsers/*` - Team/draft parsing

### Phase 3: Handle Missing Fields

**Missing Field Strategies:**

1. **`ability_details[]`**
   - Option A: Join with `abilities` table using `ability_primary` and `ability_hidden`
   - Option B: Fetch from `pokeapi_resources` table (if available)
   - Option C: Fetch from PokeAPI on-demand (fallback)

2. **`move_details[]`**
   - Option A: Join with `pokemon_moves` → `moves` table
   - Option B: Fetch from `pokeapi_resources` table
   - Option C: Fetch from PokeAPI on-demand (fallback)

3. **`moves[]`**
   - Option A: Query `pokemon_moves` table
   - Option B: Fetch from `pokeapi_resources`
   - Option C: Fetch from PokeAPI on-demand

4. **`draft_cost` and `tier`**
   - These are league-specific fields
   - May need separate `pokemon_draft_metadata` table
   - Or calculate on-the-fly from base stats

5. **`expires_at`**
   - Not needed for projection table (always up-to-date)
   - Remove expiration checks

### Phase 4: Sprite URL Handling

**Current:** `pokemon_cache` stores sprite URLs  
**Target:** `pokepedia_pokemon` stores sprite paths

**Strategy:**
- Use existing `getSpriteUrl()` function in `lib/pokemon-utils.ts`
- It already handles `sprite_front_default_path` and `sprite_official_artwork_path`
- Falls back to MinIO → GitHub PokeAPI sprites repo
- ✅ Already implemented!

---

## 🛠️ Implementation Plan

### Step 1: Create Adapter Function

```typescript
// lib/pokepedia-adapter.ts (NEW FILE)

import { PokemonDisplayData } from "@/lib/pokemon-types"

interface PokepediaPokemonRow {
  id: number
  name: string
  species_name?: string
  height?: number
  weight?: number
  base_experience?: number
  sprite_front_default_path?: string
  sprite_official_artwork_path?: string
  types?: string[] | null
  type_primary?: string | null
  type_secondary?: string | null
  base_stats?: {
    hp?: number
    attack?: number
    defense?: number
    special_attack?: number
    special_defense?: number
    speed?: number
  } | null
  total_base_stat?: number
  abilities?: Array<{
    name: string
    is_hidden: boolean
    slot: number
  }> | null
  ability_primary?: string | null
  ability_hidden?: string | null
  order?: number
  generation?: number
  moves_count?: number
  forms_count?: number
}

/**
 * Convert pokepedia_pokemon row to PokemonDisplayData format
 */
export function adaptPokepediaToDisplayData(
  row: PokepediaPokemonRow
): PokemonDisplayData {
  // Map base_stats format
  const baseStats = row.base_stats ? {
    hp: row.base_stats.hp || 0,
    attack: row.base_stats.attack || 0,
    defense: row.base_stats.defense || 0,
    "special-attack": row.base_stats.special_attack || 0,
    "special-defense": row.base_stats.special_defense || 0,
    speed: row.base_stats.speed || 0,
  } : {
    hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0
  }

  // Map types array
  const types = Array.isArray(row.types) ? row.types : 
                row.type_primary ? [row.type_primary, row.type_secondary].filter(Boolean) : []

  // Map abilities array (just names for now)
  const abilities = Array.isArray(row.abilities) 
    ? row.abilities.map(a => a.name)
    : row.ability_primary ? [row.ability_primary] : []

  return {
    pokemon_id: row.id,
    name: row.name,
    types,
    base_stats: baseStats,
    abilities,
    moves: [], // Will be fetched separately if needed
    sprites: {
      front_default: row.sprite_front_default_path || "",
      official_artwork: row.sprite_official_artwork_path || "",
      // Other sprites will use fallback logic
    },
    ability_details: [], // Will be fetched separately if needed
    move_details: [], // Will be fetched separately if needed
    generation: row.generation || 1,
    draft_cost: 0, // Will be calculated or fetched separately
    tier: "", // Will be calculated or fetched separately
  }
}
```

### Step 2: Update `getPokemon()` Function

```typescript
// lib/pokemon-utils.ts

export async function getPokemon(nameOrId: string | number): Promise<PokemonDisplayData | null> {
  try {
    const supabase = getSupabaseClient()
    
    // Query pokepedia_pokemon instead of pokemon_cache
    const query = typeof nameOrId === "number"
      ? supabase.from("pokepedia_pokemon").select("*").eq("id", nameOrId).maybeSingle()
      : supabase.from("pokepedia_pokemon").select("*").eq("name", nameOrId.toLowerCase()).maybeSingle()

    const { data: cached, error } = await query

    if (error) {
      // Handle errors gracefully
      if (error.code !== "PGRST116") {
        console.warn("[Pokemon Utils] Query error, falling back to API:", error)
      }
      // Fall through to API fetch
    }

    if (cached && !error) {
      const adapted = adaptPokepediaToDisplayData(cached)
      
      // Optionally fetch additional data (ability_details, move_details)
      // if needed for the use case
      
      return adapted
    }

    // Cache miss - fetch from API
    const extended = await getPokemonDataExtended(nameOrId, false)
    if (extended) {
      return parsePokemonFromCache(extended)
    }

    return null
  } catch (error) {
    console.error("[Pokemon Utils] Error fetching Pokemon:", error)
    return null
  }
}
```

### Step 3: Update Other Functions

Similar updates needed for:
- `getAllPokemonFromCache()` → Query `pokepedia_pokemon`
- `searchPokemon()` → Query `pokepedia_pokemon` with filters
- `lib/draft-system.ts` → Update queries
- `lib/google-sheets-parsers/*` → Update queries

---

## ⚠️ Considerations

### 1. Missing Fields Impact

**High Impact:**
- `ability_details[]` - Used in Pokemon detail views
- `move_details[]` - Used in Pokemon detail views

**Medium Impact:**
- `moves[]` - Used for move lists
- `draft_cost`, `tier` - Used in draft system

**Low Impact:**
- `expires_at` - Not needed (projection table is always current)

### 2. Performance Considerations

- `pokepedia_pokemon` is optimized for UI queries (indexes on types, stats, etc.)
- May need additional queries for `ability_details` and `move_details`
- Consider caching these in memory or separate table if frequently accessed

### 3. Backward Compatibility

- Keep `pokemon_cache` table temporarily (don't delete yet)
- Can fallback to `pokemon_cache` if `pokepedia_pokemon` query fails
- Remove `pokemon_cache` dependency after full migration

---

## 📊 Testing Plan

1. **Unit Tests:**
   - Test adapter function with sample `pokepedia_pokemon` data
   - Test field mappings
   - Test missing field handling

2. **Integration Tests:**
   - Test `getPokemon()` with starter Pokemon (1, 4, 7, etc.)
   - Test `getAllPokemonFromCache()` returns data
   - Test `searchPokemon()` with various filters

3. **Production Testing:**
   - Deploy to staging first
   - Test with real production data
   - Monitor for errors and performance

---

## 🚀 Next Steps

1. ✅ **Schema Analysis** (COMPLETED)
2. ⏳ **Create Adapter Function** (NEXT)
3. ⏳ **Update Core Functions** (AFTER ADAPTER)
4. ⏳ **Handle Missing Fields** (PARALLEL)
5. ⏳ **Test Migration** (BEFORE PRODUCTION)
6. ⏳ **Deploy** (AFTER TESTING)
7. ⏳ **Remove pokemon_cache Dependency** (AFTER VERIFICATION)

---

## 📝 Notes

- `pokepedia_pokemon` is a projection table optimized for read queries
- It's populated by the `pokepedia-worker` edge function
- Data is always current (no expiration needed)
- Missing fields can be fetched on-demand from related tables or PokeAPI
