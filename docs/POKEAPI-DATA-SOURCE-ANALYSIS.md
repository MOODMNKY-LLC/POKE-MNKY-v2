# PokeAPI Data Source Analysis

## Current Architecture

### Data Flow Strategy
**Server-Side Operations** (API routes, server components):
1. **Primary**: Custom PokeAPI (`pokeapi.moodmnky.com`) - Respects fair use, keeps internal infra comprehensive
2. **Fallback**: Official PokeAPI (`pokeapi.co`) - If custom API fails or has incomplete data

**Client-Side Operations** (React hooks, components):
1. **Primary**: Official PokeAPI (`pokeapi.co`) via `pokenode-ts` PokemonClient - Direct, simple, no server overhead

**Data Sources**:
1. **Primary**: `pokepedia_pokemon` table (Supabase) - Production data
2. **Fallback**: `pokemon_cache` table (Supabase) - Cached PokeAPI data
3. **Final Fallback**: PokeAPI (custom on server, official on client)

### Custom PokeAPI at `pokeapi.moodmnky.com`
- **Status**: ❌ **Incomplete/Not Ready**
- **Issues Found**:
  - `stats: []` - Empty array (should contain base stats)
  - `types: []` - Empty array (should contain type information)
  - `moves: []` - Empty array (should contain move list)
  - `sprites.*` - All null (should contain sprite URLs)
  - Only basic fields populated: `id`, `name`, `height`, `weight`, `abilities` (partial)

### Official PokeAPI at `pokeapi.co`
- **Status**: ✅ **Complete and Reliable**
- **Data Available**:
  - ✅ Complete base stats (hp, attack, defense, special-attack, special-defense, speed)
  - ✅ Types array with full type information
  - ✅ Moves array with version group details
  - ✅ Complete sprite URLs (front_default, back_default, shiny variants, official artwork)
  - ✅ Ability details with effect descriptions
  - ✅ All other Pokemon metadata

## Current Implementation

### **Server-Side: Custom API with Official Fallback**
- ✅ Uses `pokeapi.moodmnky.com` first (respects fair use)
- ✅ Falls back to `pokeapi.co` if custom API fails or has incomplete data
- ✅ Used in: API routes (`/api/pokemon/[name]`), server components, batch operations

### **Client-Side: Official API via pokenode-ts**
- ✅ Uses `pokeapi.co` directly via `pokenode-ts` PokemonClient
- ✅ Simple, reliable, no server overhead
- ✅ Used in: React hooks (`usePokemonData`, `usePokemonBatch`), client components

### **Benefits of This Architecture:**
1. ✅ **Respects Fair Use**: Server-side operations use custom API, reducing load on official API
2. ✅ **Keeps Internal Infra Comprehensive**: Server-side usage populates and maintains custom API
3. ✅ **Client-Side Simplicity**: Direct API access via pokenode-ts, no server round-trip
4. ✅ **Automatic Fallback**: If custom API fails, automatically uses official API
5. ✅ **Best of Both Worlds**: Custom API for internal operations, official API for client-side

## Implementation Details

### Files Using PokeAPI:

1. **`lib/pokemon-api-enhanced.ts`** ✅ **UPDATED**:
   - **Server-side**: Uses `fetchPokemonData()` which tries custom API first, falls back to official
   - **Client-side**: Uses `pokenode-ts` PokemonClient (official API)
   - **Abilities/Moves**: Server-side uses custom API with official fallback, client-side uses official API
   - ✅ **Smart routing**: Automatically detects server vs client and uses appropriate API

2. **`lib/pokemon-api.ts`**:
   - Uses `PokemonClient` from `pokenode-ts` (client-side only)
   - ✅ **No changes needed** - only used client-side

3. **`lib/pokemon-utils.ts`**:
   - Calls `getPokemonDataExtended()` which automatically routes:
     - Server-side → Custom API → Official API fallback
     - Client-side → Official API via pokenode-ts
   - ✅ **Already has smart routing**

### Configuration:
- **`lib/pokeapi-config.ts`**: ✅ Supports `POKEAPI_BASE_URL` env var
- **Default Custom API**: `https://pokeapi.moodmnky.com/api/v2`
- **Fallback Official API**: `https://pokeapi.co/api/v2` (always available)

### Environment Variables:
```bash
# Optional: Override custom API URL (defaults to pokeapi.moodmnky.com)
POKEAPI_BASE_URL=https://pokeapi.moodmnky.com/api/v2
NEXT_PUBLIC_POKEAPI_BASE_URL=https://pokeapi.moodmnky.com/api/v2  # For client-side (if needed)
```

## How It Works

### Server-Side Flow (API Routes, Server Components):
1. Try custom API (`pokeapi.moodmnky.com`)
2. Check if data is complete (stats, types populated)
3. If incomplete or fails → Fallback to official API (`pokeapi.co`)
4. Cache results in Supabase `pokemon_cache` table

### Client-Side Flow (React Hooks, Components):
1. Use `pokenode-ts` PokemonClient (official API)
2. Direct API access, no server round-trip
3. Results cached in component state

### Benefits:
- ✅ **Respects Fair Use**: Server operations use custom API
- ✅ **Keeps Internal Infra Comprehensive**: Server usage populates custom API
- ✅ **Client-Side Simplicity**: Direct official API access
- ✅ **Automatic Fallback**: Seamless fallback if custom API fails
- ✅ **Best Performance**: Client-side avoids server round-trip

## Data Requirements

### Required Fields for `PokemonDisplayData`:
```typescript
{
  pokemon_id: number
  name: string
  types: string[]              // ✅ Official API has this
  base_stats: {                // ✅ Official API has this
    hp: number
    attack: number
    defense: number
    special_attack: number
    special_defense: number
    speed: number
  }
  abilities: string[]           // ✅ Official API has this
  moves: string[]              // ✅ Official API has this
  sprites: {                   // ✅ Official API has this
    front_default: string | null
    front_shiny: string | null
    back_default: string | null
    back_shiny: string | null
    official_artwork: string | null
  }
  // Optional but nice to have:
  ability_details?: Array<{...}>
  move_details?: Array<{...}>
}
```

### Custom API Status:
- ❌ Missing: `stats`, `types`, `moves`, `sprites`
- ⚠️ Partial: `abilities` (has structure but missing details)

## Conclusion

**Current Architecture**: ✅ **IMPLEMENTED**

- **Server-Side**: Uses custom API (`pokeapi.moodmnky.com`) first, falls back to official API
- **Client-Side**: Uses official API (`pokeapi.co`) via `pokenode-ts` PokemonClient
- **Sprites**: Sourced from GitHub (`https://raw.githubusercontent.com/PokeAPI/sprites/master/...`) ✅

**Benefits**:
1. ✅ Respects PokeAPI fair use (server operations use custom API)
2. ✅ Keeps internal infrastructure comprehensive (server usage populates custom API)
3. ✅ Client-side simplicity (direct official API access, no server round-trip)
4. ✅ Automatic fallback (seamless fallback if custom API fails or incomplete)

**Custom API Status**:
- ⚠️ Currently incomplete (empty stats/types/moves arrays)
- ✅ Automatic fallback ensures functionality
- ✅ As custom API is populated, it will be used automatically
- ✅ No code changes needed when custom API is ready
