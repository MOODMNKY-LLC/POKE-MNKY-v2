# Current Pokemon Cache System Analysis

## 🔍 How Pokemon Caching Currently Works

### Flow Diagram
```
App Request → getPokemonDataExtended()
    ↓
Check pokemon_cache table (expires_at > now?)
    ↓
Cache Hit? → Return cached data ✅
    ↓ No
Cache Miss → Fetch from PokeAPI /pokemon/{id}
    ↓
Transform data (extract stats, types, abilities, moves)
    ↓
Fetch ability details (from /ability/{id})
    ↓
Fetch move details (from /move/{id}) [optional]
    ↓
Store in pokemon_cache table
    ↓
Return data ✅
```

### Current Implementation

**File**: `lib/pokemon-api-enhanced.ts`

**Function**: `getPokemonDataExtended(nameOrId, includeMoveDetails)`

**Process**:
1. **Cache Check**: Queries `pokemon_cache` where `pokemon_id = X` and `expires_at > now()`
2. **Cache Hit**: Returns if `sprites` and `ability_details` exist
3. **Cache Miss**: Fetches from PokeAPI `/pokemon/{id}` endpoint
4. **Data Enrichment**:
   - Fetches ability details from `/ability/{id}` (first 3 abilities)
   - Optionally fetches move details from `/move/{id}` (top 20 moves)
5. **Storage**: Upserts to `pokemon_cache` with 30-day expiration

### Current Schema (`pokemon_cache`)

```sql
pokemon_id INTEGER PRIMARY KEY
name TEXT
types TEXT[]                    -- Array: ["fire", "flying"]
base_stats JSONB               -- {hp: 78, attack: 84, ...}
abilities TEXT[]               -- Array: ["blaze", "solar-power"]
moves TEXT[]                   -- Array: ["flamethrower", "fly", ...]
sprites JSONB                  -- {front_default, front_shiny, ...}
ability_details JSONB[]        -- [{name, is_hidden, effect, effect_verbose}]
move_details JSONB[]           -- [{name, type, category, power, ...}]
evolution_chain JSONB          -- Currently NULL (TODO)
regional_forms TEXT[]          -- Currently [] (TODO)
hidden_ability TEXT            -- Extracted from abilities
gender_rate INTEGER            -- Currently -1 (TODO)
generation INTEGER              -- Calculated from pokemon_id
draft_cost INTEGER              -- Calculated from base stat total
tier TEXT                      -- Calculated from base stat total
payload JSONB                  -- Full PokeAPI response
fetched_at TIMESTAMPTZ
expires_at TIMESTAMPTZ         -- fetched_at + 30 days
```

### What's Currently Cached

**✅ Cached**:
- Basic Pokemon info (id, name, height, weight)
- Base stats (HP, Attack, Defense, SpA, SpD, Speed)
- Types (array)
- Abilities (array + details for first 3)
- Moves (array + details for top 20)
- Sprites (all variants)
- Generation (calculated)

**❌ NOT Cached**:
- Items / Held items
- Evolution chains (endpoint not called)
- Forms / Varieties (not fetched)
- Species data (endpoint not called)
- Location area encounters
- Base experience
- Gender rate (not fetched from species)
- Egg groups
- Capture rate
- Growth rate
- Habitat
- Color
- Shape
- Flavor text entries
- Pokedex numbers

### Current Sync Scripts

**1. `scripts/full-sync-pokemon.ts`**:
- Syncs Pokemon IDs 1-1025
- Uses `getPokemonDataExtended(id, true)` (includes move details)
- Rate limit: 100ms between requests
- Checkpoint every 50 Pokemon
- Retry logic: 3 attempts with exponential backoff

**2. `scripts/incremental-sync-pokemon.ts`**:
- Detects new Pokemon (IDs > max cached)
- Finds expired entries (`expires_at < now()`)
- Syncs only missing/expired Pokemon

**3. `scripts/pre-cache-competitive-pokemon.ts`:
- Pre-caches top 48 competitive Pokemon
- Uses `batchCacheCompetitivePokemon()`

### Current Database State

**Verified via Direct SQL**:
- ✅ **1,025 Pokemon** in `pokemon_cache`
- ✅ **100% have sprites**
- ✅ **100% have ability_details**
- ✅ **100% have move_details**
- ✅ **100% have generation data**

**Issue**: PostgREST schema cache not seeing `pokemon_cache` (same issue as `draft_pool`)

---

## 🎯 Why Pokemon Might Be Missing Locally

### Possible Causes

1. **Schema Cache Issue** (Most Likely)
   - PostgREST can't see `pokemon_cache` table
   - Same issue as `draft_pool` table
   - **Solution**: `supabase stop && supabase start`

2. **Different Database Instance**
   - Local Supabase vs Remote Supabase
   - Verification script might be querying wrong instance
   - **Solution**: Verify `NEXT_PUBLIC_SUPABASE_URL` points to local instance

3. **RLS Policies**
   - Service role might not have access
   - **Solution**: Check RLS policies (should allow service_role)

4. **Data Expired**
   - `expires_at < now()` means data expired
   - **Solution**: Re-run sync script

---

## 🔧 How to Verify Current Cache

### Direct SQL Query (Bypasses PostgREST)
```sql
-- Check total Pokemon
SELECT COUNT(*) FROM public.pokemon_cache;

-- Check by generation
SELECT generation, COUNT(*) 
FROM public.pokemon_cache 
GROUP BY generation 
ORDER BY generation;

-- Check specific Pokemon
SELECT pokemon_id, name, generation 
FROM public.pokemon_cache 
WHERE name IN ('pikachu', 'charizard', 'mewtwo')
ORDER BY pokemon_id;

-- Check data completeness
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN sprites IS NOT NULL THEN 1 END) as with_sprites,
  COUNT(CASE WHEN ability_details IS NOT NULL THEN 1 END) as with_abilities,
  COUNT(CASE WHEN move_details IS NOT NULL THEN 1 END) as with_moves,
  COUNT(CASE WHEN generation IS NOT NULL THEN 1 END) as with_generation
FROM public.pokemon_cache;
```

### Via Supabase Client
```typescript
import { createServiceRoleClient } from "@/lib/supabase/service"

const supabase = createServiceRoleClient()
const { data, error } = await supabase
  .from("pokemon_cache")
  .select("pokemon_id, name, generation")
  .limit(10)

console.log("Pokemon in cache:", data)
```

---

## 🚀 Next Steps

### Immediate Actions

1. **Refresh Schema Cache**:
   ```bash
   supabase stop
   supabase start
   ```

2. **Verify Cache Access**:
   ```sql
   SELECT COUNT(*) FROM pokemon_cache;
   ```

3. **Run Comprehensive Sync** (if needed):
   ```bash
   # Step 1: Master data
   npx tsx scripts/comprehensive-pokedex-sync.ts master
   
   # Step 2: Pokemon data
   npx tsx scripts/comprehensive-pokedex-sync.ts pokemon 1 1025
   
   # Step 3: Evolution chains
   npx tsx scripts/comprehensive-pokedex-sync.ts evolution
   ```

---

**Status**: Current system analyzed, comprehensive system designed and ready

**Last Updated**: 2026-01-12
