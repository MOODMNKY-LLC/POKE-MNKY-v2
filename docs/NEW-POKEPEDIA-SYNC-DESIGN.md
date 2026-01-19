# New Pokepedia Sync System - Design Document

## Overview

A simple, efficient, and maintainable sync system to populate Pokemon data tables from PokeAPI. This replaces the complex queue-based system that was consistently failing.

---

## Design Principles

1. **Simplicity** - Single script, no queues, no Edge Functions
2. **Direct Writes** - Write directly to database tables
3. **Clear Progress** - Console logging with progress indicators
4. **Testable** - Can run locally, easy to debug
5. **Focused** - Only populate tables actually needed by app
6. **Reliable** - Simple retry logic, clear error handling

---

## Target Tables (Minimal Set)

### Essential Tables (Populated by New Sync)

1. **`pokemon_cache`** - Primary table for draft system
   - Columns: `pokemon_id` (INTEGER), `name` (TEXT), `types` (TEXT[]), `sprites` (JSONB), `base_stats` (JSONB)
   - Purpose: Fast lookups for draft system and pokedex page
   - Source: PokeAPI `/pokemon/{id}` endpoint

2. **`pokemon`** - UUID-based table for draft system
   - Columns: `id` (UUID), `name` (TEXT), `type1` (TEXT), `type2` (TEXT)
   - Purpose: Reference table for team_rosters (uses UUID foreign key)
   - Source: Derived from `pokemon_cache` data

3. **`types`** - Master data table (if not already populated)
   - Columns: `type_id` (INTEGER), `name` (TEXT), `damage_relations` (JSONB)
   - Purpose: Type effectiveness, type icons
   - Source: PokeAPI `/type/{id}` endpoint

### Optional Tables (Populated if Needed)

4. **`pokepedia_pokemon`** - Normalized projection (optional)
   - Can be populated from `pokemon_cache` if pokedex page needs it
   - Or can be removed if `pokemon_cache` is sufficient

---

## Implementation Plan

### Phase 1: Core Sync Script

**File**: `scripts/sync-pokemon-data.ts`

**Features**:
- Uses PokeNode-ts MainClient for type-safe API access
- Fetches Pokemon list (1-1025) from PokeAPI
- Batch processes in chunks of 50
- Writes directly to `pokemon_cache` and `pokemon` tables
- Clear progress logging with percentage
- Error handling with retries (3 attempts per Pokemon)
- Rate limiting (100ms between requests - respects PokeAPI fair use)

**Output**:
- Console progress: `[1/1025] Bulbasaur... [2/1025] Ivysaur...`
- Summary: `✅ Synced 1025 Pokemon in 5m 23s`
- Error log: Failed Pokemon IDs with error messages

**Usage**:
```bash
# Run locally
npx tsx scripts/sync-pokemon-data.ts

# Run with custom range
npx tsx scripts/sync-pokemon-data.ts --start 1 --end 100

# Run with types sync
npx tsx scripts/sync-pokemon-data.ts --include-types
```

### Phase 2: Master Data Sync (If Needed)

**File**: `scripts/sync-master-data.ts`

**Features**:
- Syncs types, abilities, moves (master data)
- Only runs if tables are empty or `--force` flag used
- Single script, can run independently

**Usage**:
```bash
npx tsx scripts/sync-master-data.ts
```

### Phase 3: Database Migration

**File**: `supabase/migrations/20260122000001_setup_pokemon_cache_table.sql`

**Purpose**:
- Ensure `pokemon_cache` table exists with correct schema
- Ensure `pokemon` table exists with correct schema
- Add indexes for performance
- Add constraints for data integrity

### Phase 4: Update Data Consumers

**Files to Update**:
1. `lib/pokemon-utils.ts` - Update to use `pokemon_cache` instead of `pokepedia_pokemon`
2. `lib/draft-system.ts` - Verify it uses `pokemon_cache` correctly
3. `components/pokemon-sprite.tsx` - Verify sprite path logic
4. `app/pokedex/page.tsx` - Verify it uses `getAllPokemonFromCache()` correctly

---

## Sync Script Architecture

### Structure

```typescript
// scripts/sync-pokemon-data.ts

import { MainClient } from "pokenode-ts"
import { createServiceRoleClient } from "@/lib/supabase/service"

interface SyncOptions {
  start?: number      // Start Pokemon ID (default: 1)
  end?: number        // End Pokemon ID (default: 1025)
  includeTypes?: boolean  // Also sync types master data
  batchSize?: number  // Batch size for processing (default: 50)
  rateLimitMs?: number // Delay between requests (default: 100)
}

async function syncPokemonData(options: SyncOptions) {
  const api = new MainClient()
  const supabase = createServiceRoleClient()
  
  // 1. Sync types first (if needed)
  if (options.includeTypes) {
    await syncTypes(api, supabase)
  }
  
  // 2. Get Pokemon list
  const pokemonList = await api.pokemon.listPokemons(0, options.end || 1025)
  
  // 3. Process in batches
  const batches = chunkArray(pokemonList.results, options.batchSize || 50)
  
  for (const batch of batches) {
    await processBatch(batch, api, supabase, options.rateLimitMs || 100)
  }
  
  // 4. Populate pokemon table from pokemon_cache
  await populatePokemonTable(supabase)
}

async function processBatch(
  batch: Array<{ name: string; url: string }>,
  api: MainClient,
  supabase: any,
  rateLimitMs: number
) {
  for (const pokemon of batch) {
    try {
      // Fetch Pokemon data
      const data = await api.pokemon.getPokemonByName(pokemon.name)
      
      // Write to pokemon_cache
      await supabase.from("pokemon_cache").upsert({
        pokemon_id: data.id,
        name: data.name,
        types: data.types.map(t => t.type.name),
        sprites: data.sprites,
        base_stats: data.stats.reduce((acc, stat) => {
          acc[stat.stat.name] = stat.base_stat
          return acc
        }, {}),
        updated_at: new Date().toISOString()
      })
      
      // Rate limit
      await sleep(rateLimitMs)
    } catch (error) {
      console.error(`Failed to sync ${pokemon.name}:`, error)
      // Retry logic here
    }
  }
}
```

### Key Features

1. **Progress Tracking**
   - Real-time console output: `[150/1025] Syncing Mewtwo... (14.6%)`
   - ETA calculation based on average time per Pokemon
   - Summary at end: total time, success count, error count

2. **Error Handling**
   - Retry failed requests (3 attempts with exponential backoff)
   - Log errors to console and continue
   - Track failed Pokemon IDs for manual retry

3. **Rate Limiting**
   - Configurable delay between requests (default: 100ms)
   - Respects PokeAPI fair use policy
   - Can be adjusted for faster syncs if needed

4. **Data Transformation**
   - Extracts types array from nested PokeAPI structure
   - Transforms stats array to object for easier querying
   - Handles sprite URLs (can use GitHub sprites repo)

---

## Database Schema

### pokemon_cache Table (Existing Schema)

The table already exists with the following columns:
- `pokemon_id` (INTEGER PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `types` (TEXT[] NOT NULL)
- `base_stats` (JSONB NOT NULL)
- `abilities` (TEXT[] NOT NULL)
- `moves` (TEXT[] NOT NULL)
- `sprite_url` (TEXT)
- `sprites` (JSONB)
- `draft_cost` (INTEGER, default: 10)
- `tier` (TEXT)
- `payload` (JSONB NOT NULL)
- `fetched_at` (TIMESTAMPTZ, default: now())
- `expires_at` (TIMESTAMPTZ, default: now() + 30 days)
- `ability_details` (TEXT[])
- `move_details` (TEXT[])
- `evolution_chain` (JSONB)
- `regional_forms` (TEXT[])
- `hidden_ability` (TEXT)
- `gender_rate` (INTEGER, default: -1)
- `generation` (INTEGER)
- `base_experience` (INTEGER)
- `height` (INTEGER) -- in decimeters
- `weight` (INTEGER) -- in hectograms

**Note**: The table already exists, so the sync script will use `upsert` to populate it.

### pokemon Table (UUID-based)

```sql
CREATE TABLE IF NOT EXISTS public.pokemon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type1 TEXT,
  type2 TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pokemon_name_idx ON public.pokemon(name);
CREATE INDEX IF NOT EXISTS pokemon_types_idx ON public.pokemon(type1, type2);
```

---

## Migration Strategy

### Step 1: Create Migration
- Drop old pokepedia sync functions (already done)
- Ensure `pokemon_cache` and `pokemon` tables exist with correct schema
- Add indexes for performance

### Step 2: Run Initial Sync
```bash
# Sync all Pokemon (1-1025)
npx tsx scripts/sync-pokemon-data.ts

# Verify data
psql -c "SELECT COUNT(*) FROM pokemon_cache;"  # Should be 1025
```

### Step 3: Update Data Consumers
- Update `lib/pokemon-utils.ts` to use `pokemon_cache`
- Test draft system with new data
- Test pokedex page with new data

### Step 4: Cleanup (Optional)
- Drop `pokepedia_pokemon` table if not needed
- Drop `pokeapi_resources` table if not needed
- Drop `pokepedia_resource_totals` table if not needed

---

## Benefits Over Old System

1. ✅ **Simpler** - Single script vs multiple Edge Functions + queue system
2. ✅ **Debuggable** - Can run locally, see progress in real-time
3. ✅ **Reliable** - No queue complexity, direct database writes
4. ✅ **Faster** - No queue overhead, batch processing
5. ✅ **Maintainable** - Clear code, easy to understand and modify
6. ✅ **Testable** - Can test with small ranges (e.g., 1-10 Pokemon)

---

## Future Enhancements

1. **Incremental Sync** - Only sync Pokemon that have been updated
2. **Parallel Processing** - Process multiple batches concurrently
3. **Progress Persistence** - Save progress to database for resumable syncs
4. **Webhook Notifications** - Notify when sync completes
5. **Admin UI** - Simple admin page to trigger syncs and view progress

---

## Testing Plan

1. **Unit Tests**
   - Test data transformation functions
   - Test error handling and retries
   - Test rate limiting

2. **Integration Tests**
   - Test sync with small range (1-10 Pokemon)
   - Test sync with full range (1-1025 Pokemon)
   - Test sync with existing data (upsert behavior)

3. **Manual Testing**
   - Run sync locally and verify data in database
   - Test draft system with synced data
   - Test pokedex page with synced data

---

## Rollout Plan

1. **Week 1**: Create migration and sync script
2. **Week 2**: Test sync script locally
3. **Week 3**: Update data consumers
4. **Week 4**: Run production sync and verify

---

## Success Criteria

- ✅ Sync completes successfully (1025 Pokemon synced)
- ✅ Draft system works with synced data
- ✅ Pokedex page displays Pokemon correctly
- ✅ Sync can be run on-demand via script
- ✅ Clear progress logging and error reporting
- ✅ No queue complexity or Edge Function overhead
