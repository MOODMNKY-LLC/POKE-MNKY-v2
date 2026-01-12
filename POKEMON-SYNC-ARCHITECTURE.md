# Pokémon Data Synchronization Architecture
**Comprehensive System for PokéAPI → Supabase Data Pipeline**

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Use Cases & Requirements](#use-cases--requirements)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Synchronization Mechanisms](#synchronization-mechanisms)
6. [Data Validation & Integrity](#data-validation--integrity)
7. [Incremental Update Strategy](#incremental-update-strategy)
8. [In-App Retrieval Patterns](#in-app-retrieval-patterns)
9. [Performance Optimization](#performance-optimization)
10. [Deployment & Operations](#deployment--operations)

---

## Executive Summary

This document outlines a robust architecture for synchronizing Pokémon data from the [PokéAPI](https://pokeapi.co) to a Supabase PostgreSQL database. The system addresses:

- **Performance**: 98% reduction in API calls through intelligent caching
- **Offline Access**: Full Pokémon data available without external dependencies
- **Cost Optimization**: Minimize PokéAPI rate limits and Vercel serverless invocations
- **Data Freshness**: Incremental updates without redundant transfers
- **Scalability**: Handles 1,025+ Pokémon with moves, abilities, evolutions, and sprites

**Current Status**: 
- ✅ Database schema complete (3 migration files)
- ✅ Basic & Enhanced API clients implemented
- ✅ Pre-cache script ready for 50 competitive Pokémon
- ❌ **Database migrations NOT executed** (0 tables in Supabase)
- ⚠️ Full sync job needs implementation

---

## Use Cases & Requirements

### Primary Use Cases

| Use Case | Description | Storage Benefits |
|----------|-------------|------------------|
| **Team Builder** | Draft Pokémon with point budgets, view type coverage, optimize stats | Instant roster validation, offline draft support |
| **Pokédex Browser** | Search by name/type/tier, view sprites & abilities | Sub-100ms queries, no rate limits |
| **Battle Simulator** | Select moves, calculate damage, track KOs | Pre-loaded move data, deterministic outcomes |
| **AI Insights** | GPT-powered analysis of team composition, move selection | Grounded data prevents hallucinations |
| **Match Reporting** | Submit results with Pokémon used & KOs | Historical stats aggregation |
| **Weekly Recaps** | AI-generated summaries with Pokémon performance | Fast analytics queries |

### Non-Functional Requirements

- **Latency**: <100ms for cached queries, <2s for cache misses
- **Availability**: 99.9% uptime for cached data (independent of PokéAPI status)
- **Consistency**: 30-day cache TTL with on-demand refresh
- **Cost**: <$5/month for database storage, <100 PokéAPI calls/day
- **Scalability**: Support 1,025+ Pokémon with 900+ moves and 350+ abilities

---

## Architecture Overview

### System Components

```
┌──────────────────┐
│   PokéAPI v2     │  External Data Source (Rate Limited: 100 req/min)
│  pokeapi.co/api │
└────────┬─────────┘
         │
         │ Sync Job (Scheduled/On-Demand)
         ▼
┌──────────────────────────────────────────────────────────────┐
│              SYNCHRONIZATION LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐     │
│  │ Pokemon Sync │  │  Move Sync   │  │ Ability Sync  │     │
│  │   Worker     │  │   Worker     │  │    Worker     │     │
│  └──────────────┘  └──────────────┘  └───────────────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    Validation & Transform                    │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                  SUPABASE POSTGRESQL                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  pokemon_cache (Primary Storage)                    │    │
│  │  ├─ pokemon_id (PK)                                 │    │
│  │  ├─ name, types[], base_stats (JSONB)              │    │
│  │  ├─ sprites (JSONB) - All variants                 │    │
│  │  ├─ ability_details (JSONB[])                      │    │
│  │  ├─ move_details (JSONB[]) - Top 20 competitive   │    │
│  │  ├─ evolution_chain (JSONB)                        │    │
│  │  ├─ generation, tier, draft_cost                   │    │
│  │  └─ fetched_at, expires_at (TTL)                   │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  moves_cache (Supplementary)                        │    │
│  │  ├─ move_id, name, type, category                  │    │
│  │  ├─ power, accuracy, pp, priority                  │    │
│  │  ├─ effect, effect_verbose                         │    │
│  │  └─ contest_type, ailment, flinch_chance          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  abilities_cache (Supplementary)                    │    │
│  │  ├─ ability_id, name, is_hidden                    │    │
│  │  ├─ effect, effect_verbose                         │    │
│  │  └─ generation                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  sync_jobs (Audit Trail)                           │    │
│  │  ├─ job_id, job_type, status                       │    │
│  │  ├─ pokemon_synced, moves_synced, abilities_synced│    │
│  │  ├─ started_at, completed_at, duration_ms          │    │
│  │  └─ error_log (JSONB)                              │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                             │
                             │ Read Operations (RLS Protected)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐     │
│  │   Pokédex    │  │ Team Builder │  │ Battle Engine │     │
│  │     UI       │  │      UI      │  │      UI       │     │
│  └──────────────┘  └──────────────┘  └───────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

**Initial Sync (Cold Start)**:
1. Execute database migrations (`001_create_schema.sql`, `002_enhanced_schema.sql`, `003_add_extended_pokemon_fields.sql`)
2. Run `scripts/pre-cache-competitive-pokemon.ts` to populate top 50 competitive Pokémon
3. Schedule full sync job for remaining 975+ Pokémon (overnight, rate-limited)

**Incremental Sync (Warm Updates)**:
1. Check `expires_at` for cached entries
2. Fetch only expired or missing records
3. Update `fetched_at` and `expires_at` timestamps

**Real-Time Access**:
1. Query `pokemon_cache` table directly (no API calls)
2. Fall back to PokéAPI if cache miss (rare)
3. Cache response for 30 days

---

## Database Schema

### Core Tables

#### `pokemon_cache` (Primary Storage)

```sql
CREATE TABLE public.pokemon_cache (
  pokemon_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  types TEXT[] NOT NULL,
  base_stats JSONB NOT NULL,
  abilities TEXT[] NOT NULL,
  moves TEXT[] NOT NULL,
  sprite_url TEXT,
  
  -- Extended fields (from 003_add_extended_pokemon_fields.sql)
  sprites JSONB,
  ability_details JSONB[],
  move_details JSONB[],
  evolution_chain JSONB,
  regional_forms TEXT[],
  hidden_ability TEXT,
  gender_rate INTEGER DEFAULT -1,
  generation INTEGER,
  
  -- Draft & competitive metadata
  draft_cost INTEGER DEFAULT 10,
  tier TEXT,
  
  -- Full API response for extensibility
  payload JSONB NOT NULL,
  
  -- Cache management
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_pokemon_cache_name ON pokemon_cache(name);
CREATE INDEX idx_pokemon_cache_tier ON pokemon_cache(tier);
CREATE INDEX idx_pokemon_cache_draft_cost ON pokemon_cache(draft_cost);
CREATE INDEX idx_pokemon_cache_generation ON pokemon_cache(generation);
CREATE INDEX idx_pokemon_cache_regional_forms ON pokemon_cache USING GIN(regional_forms);
CREATE INDEX idx_pokemon_cache_types ON pokemon_cache USING GIN(types);
CREATE INDEX idx_pokemon_cache_expires ON pokemon_cache(expires_at);
```

**Field Descriptions**:

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `pokemon_id` | INTEGER | PokéAPI ID (1-1025+) | `25` (Pikachu) |
| `name` | TEXT | Lowercase name from API | `"pikachu"` |
| `types` | TEXT[] | Pokémon types | `["electric"]` |
| `base_stats` | JSONB | HP, Atk, Def, SpA, SpD, Spe | `{"hp": 35, "attack": 55, ...}` |
| `sprites` | JSONB | All sprite URLs (front/back/shiny/artwork) | `{"front_default": "https://...", ...}` |
| `ability_details` | JSONB[] | Ability names + effects | `[{"name": "static", "is_hidden": false, ...}]` |
| `move_details` | JSONB[] | Top 20 competitive moves | `[{"name": "thunderbolt", "power": 90, ...}]` |
| `evolution_chain` | JSONB | Evolution stages & conditions | `{"evolves_to": [{"species": "raichu", ...}]}` |
| `regional_forms` | TEXT[] | Alolan, Galarian, etc. | `["alolan"]` |
| `draft_cost` | INTEGER | Points for budget drafting (5-20) | `10` |
| `tier` | TEXT | Competitive tier (Uber/OU/UU/RU/NU/PU) | `"OU"` |
| `expires_at` | TIMESTAMPTZ | Cache expiration (30 days from fetch) | `2026-02-11 08:00:00+00` |

#### `moves_cache` (Supplementary - Optional)

```sql
CREATE TABLE public.moves_cache (
  move_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL, -- physical, special, status
  power INTEGER,
  accuracy INTEGER,
  pp INTEGER NOT NULL,
  priority INTEGER DEFAULT 0,
  effect TEXT,
  effect_verbose TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days'
);

CREATE INDEX idx_moves_cache_name ON moves_cache(name);
CREATE INDEX idx_moves_cache_type ON moves_cache(type);
CREATE INDEX idx_moves_cache_category ON moves_cache(category);
```

**Usage**: Store all 900+ moves separately for advanced filtering (e.g., "Show all Fire-type physical moves"). **Optional** - can embed top moves in `pokemon_cache.move_details` instead.

#### `abilities_cache` (Supplementary - Optional)

```sql
CREATE TABLE public.abilities_cache (
  ability_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  effect TEXT NOT NULL,
  effect_verbose TEXT,
  generation INTEGER,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days'
);

CREATE INDEX idx_abilities_cache_name ON abilities_cache(name);
```

**Usage**: Store all 350+ abilities separately for advanced searching. **Optional** - can embed in `pokemon_cache.ability_details` instead.

#### `sync_jobs` (Audit Trail)

```sql
CREATE TABLE public.sync_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL, -- 'full', 'incremental', 'competitive', 'single'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'partial'
  
  -- Counters
  pokemon_synced INTEGER DEFAULT 0,
  pokemon_failed INTEGER DEFAULT 0,
  moves_synced INTEGER DEFAULT 0,
  abilities_synced INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) STORED,
  
  -- Error tracking
  error_log JSONB,
  
  -- Metadata
  triggered_by TEXT, -- 'manual', 'cron', 'webhook', 'user:{user_id}'
  config JSONB -- Sync parameters (e.g., {"generation": 1, "limit": 151})
);

CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_started ON sync_jobs(started_at DESC);
```

**Usage**: Track all sync operations for monitoring, debugging, and auditing.

---

## Synchronization Mechanisms

### Sync Strategies

#### 1. **Full Sync** (Initial Load)
**Trigger**: First deployment, database reset  
**Scope**: All 1,025+ Pokémon with full details  
**Duration**: ~2-3 hours (rate-limited to 100 req/min)  
**Process**:

```typescript
async function fullSync(): Promise<void> {
  const supabase = createClient(...)
  const totalPokemon = 1025 // Current gen 9 total
  
  const { data: jobData } = await supabase
    .from('sync_jobs')
    .insert({
      job_type: 'full',
      config: { total_pokemon: totalPokemon }
    })
    .select()
    .single()
  
  const jobId = jobData.job_id
  
  try {
    for (let id = 1; id <= totalPokemon; id++) {
      try {
        await getPokemonDataExtended(id, true) // Include moves
        
        await supabase
          .from('sync_jobs')
          .update({ pokemon_synced: id })
          .eq('job_id', jobId)
        
        // Rate limit: 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[v0] Failed to sync Pokemon ${id}:`, error)
        
        await supabase
          .from('sync_jobs')
          .update({ 
            pokemon_failed: supabase.rpc('increment', { row_id: jobId, column: 'pokemon_failed' }),
            error_log: supabase.rpc('append_error', { 
              job_id: jobId, 
              error: { pokemon_id: id, message: error.message }
            })
          })
          .eq('job_id', jobId)
      }
    }
    
    await supabase
      .from('sync_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      
  } catch (error) {
    await supabase
      .from('sync_jobs')
      .update({ 
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_log: { global_error: error.message }
      })
      .eq('job_id', jobId)
  }
}
```

**Optimizations**:
- Run overnight or during low-traffic periods
- Checkpoint every 50 Pokémon to enable resume on failure
- Use `pokemon_cache.expires_at` to skip already-cached entries

#### 2. **Incremental Sync** (Maintenance)
**Trigger**: Daily cron job (3 AM UTC)  
**Scope**: Expired cache entries only  
**Duration**: ~5-15 minutes  
**Process**:

```typescript
async function incrementalSync(): Promise<void> {
  const supabase = createClient(...)
  
  // Find expired entries
  const { data: expired } = await supabase
    .from('pokemon_cache')
    .select('pokemon_id')
    .lt('expires_at', new Date().toISOString())
    .order('pokemon_id')
  
  if (!expired || expired.length === 0) {
    console.log('[v0] No expired cache entries')
    return
  }
  
  console.log(`[v0] Found ${expired.length} expired Pokemon to refresh`)
  
  for (const { pokemon_id } of expired) {
    await getPokemonDataExtended(pokemon_id, true)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
```

**Benefits**:
- Minimal API usage (only refreshes expired data)
- Keeps cache fresh without redundant transfers
- Handles new Pokémon releases (future generations)

#### 3. **Competitive Sync** (Targeted)
**Trigger**: Manual or on competitive meta shift  
**Scope**: Top 50-100 competitive Pokémon  
**Duration**: ~5 minutes  
**Process**: 

Already implemented in `scripts/pre-cache-competitive-pokemon.ts`:

```typescript
import { batchCacheCompetitivePokemon, COMPETITIVE_POKEMON_IDS } from "@/lib/pokemon-api-enhanced"

async function main() {
  await batchCacheCompetitivePokemon(COMPETITIVE_POKEMON_IDS)
}
```

**Benefits**:
- Fast initial population for draft leagues
- Ensures critical data is always fresh
- Can run after competitive tier updates

#### 4. **On-Demand Sync** (Lazy Loading)
**Trigger**: User searches for uncached Pokémon  
**Scope**: Single Pokémon  
**Duration**: ~1-2 seconds  
**Process**:

Already implemented in `lib/pokemon-api-enhanced.ts`:

```typescript
export async function getPokemonDataExtended(
  nameOrId: string | number,
  includeMoveDetails = false
): Promise<CachedPokemonExtended | null> {
  const supabase = createClient(...)
  
  // Try cache first
  const { data: cached } = await supabase
    .from('pokemon_cache')
    .select('*')
    .eq('pokemon_id', pokemonId)
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (cached) {
    console.log('[v0] Cache hit for Pokemon:', cached.name)
    return cached
  }
  
  // Cache miss - fetch from PokéAPI
  console.log('[v0] Cache miss, fetching from PokéAPI:', nameOrId)
  const pokemon = await pokemonClient.getPokemonById(pokemonId)
  
  // Transform and store
  const extendedData = transformPokemonData(pokemon)
  await supabase.from('pokemon_cache').upsert(extendedData)
  
  return extendedData
}
```

**Benefits**:
- Zero upfront sync time
- Handles edge cases (regional forms, new releases)
- Graceful degradation if PokéAPI is down (cache persists)

### Scheduling Options

#### Option A: Vercel Cron Jobs
```typescript
// app/api/cron/sync-pokemon/route.ts
export const revalidate = 0
export const maxDuration = 300 // 5 minutes

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  await incrementalSync()
  
  return Response.json({ success: true })
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/sync-pokemon",
    "schedule": "0 3 * * *"
  }]
}
```

#### Option B: GitHub Actions
```yaml
# .github/workflows/sync-pokemon.yml
name: Sync Pokemon Data
on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node scripts/sync-pokemon.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

#### Option C: External Scheduler (Railway/Render)
Deploy `scripts/sync-pokemon.ts` as standalone service with environment-based scheduling.

---

## Data Validation & Integrity

### Validation Rules

#### 1. **Schema Validation**
```typescript
const PokemonCacheSchema = z.object({
  pokemon_id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  types: z.array(z.string()).min(1).max(2),
  base_stats: z.object({
    hp: z.number().int().min(1).max(255),
    attack: z.number().int().min(1).max(255),
    defense: z.number().int().min(1).max(255),
    special_attack: z.number().int().min(1).max(255),
    special_defense: z.number().int().min(1).max(255),
    speed: z.number().int().min(1).max(255)
  }),
  sprites: z.object({
    front_default: z.string().url().nullable(),
    official_artwork: z.string().url().nullable()
  }),
  draft_cost: z.number().int().min(5).max(20),
  tier: z.enum(['Uber', 'OU', 'UU', 'RU', 'NU', 'PU']).nullable(),
  fetched_at: z.string().datetime(),
  expires_at: z.string().datetime()
})

// Validate before insert
const validated = PokemonCacheSchema.parse(pokemonData)
```

#### 2. **Conflict Resolution**
**Strategy**: Last Write Wins (LWW) with timestamp comparison

```sql
-- Upsert with conflict resolution
INSERT INTO pokemon_cache (...)
VALUES (...)
ON CONFLICT (pokemon_id) 
DO UPDATE SET
  name = EXCLUDED.name,
  types = EXCLUDED.types,
  base_stats = EXCLUDED.base_stats,
  sprites = EXCLUDED.sprites,
  ability_details = EXCLUDED.ability_details,
  move_details = EXCLUDED.move_details,
  fetched_at = EXCLUDED.fetched_at,
  expires_at = EXCLUDED.expires_at
WHERE pokemon_cache.fetched_at < EXCLUDED.fetched_at;
```

#### 3. **Data Integrity Checks**
```typescript
async function validateCacheIntegrity(): Promise<ValidationReport> {
  const supabase = createClient(...)
  
  // Check for missing critical fields
  const { data: missingSprites } = await supabase
    .from('pokemon_cache')
    .select('pokemon_id, name')
    .is('sprites', null)
  
  // Check for expired entries
  const { data: expired } = await supabase
    .from('pokemon_cache')
    .select('pokemon_id, name')
    .lt('expires_at', new Date().toISOString())
  
  // Check for incomplete data
  const { data: incomplete } = await supabase
    .from('pokemon_cache')
    .select('pokemon_id, name')
    .is('ability_details', null)
    .or('move_details.is.null')
  
  return {
    missing_sprites: missingSprites?.length || 0,
    expired_entries: expired?.length || 0,
    incomplete_entries: incomplete?.length || 0,
    total_cached: await getTotalCachedPokemon()
  }
}
```

#### 4. **Referential Integrity**
```sql
-- Ensure team_rosters reference valid Pokemon
ALTER TABLE team_rosters 
  ADD CONSTRAINT fk_pokemon_cache 
  FOREIGN KEY (pokemon_id) 
  REFERENCES pokemon_cache(pokemon_id) 
  ON DELETE RESTRICT;

-- Ensure pokemon_stats reference valid Pokemon
ALTER TABLE pokemon_stats 
  ADD CONSTRAINT fk_pokemon_cache 
  FOREIGN KEY (pokemon_id) 
  REFERENCES pokemon_cache(pokemon_id) 
  ON DELETE RESTRICT;
```

### Error Handling

#### Retry Strategy
```typescript
async function syncWithRetry(
  pokemonId: number, 
  maxRetries = 3
): Promise<CachedPokemonExtended | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getPokemonDataExtended(pokemonId, true)
    } catch (error) {
      console.error(`[v0] Attempt ${attempt}/${maxRetries} failed for Pokemon ${pokemonId}:`, error)
      
      if (attempt === maxRetries) {
        // Log to sync_jobs error_log
        await logSyncError(pokemonId, error)
        return null
      }
      
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
    }
  }
  
  return null
}
```

#### Partial Failure Handling
```typescript
async function fullSyncWithCheckpoints(): Promise<void> {
  const checkpoint = await getLastCheckpoint() || 0
  const totalPokemon = 1025
  
  console.log(`[v0] Resuming from checkpoint: ${checkpoint}`)
  
  for (let id = checkpoint + 1; id <= totalPokemon; id++) {
    await syncWithRetry(id)
    
    // Save checkpoint every 50 Pokemon
    if (id % 50 === 0) {
      await saveCheckpoint(id)
      console.log(`[v0] Checkpoint saved: ${id}/${totalPokemon}`)
    }
  }
}
```

---

## Incremental Update Strategy

### Cache Expiration Policy

**30-Day TTL** (Time-To-Live):
- Balances freshness with API usage
- PokéAPI data rarely changes (only on game updates)
- Reduces sync overhead by 97% after initial load

**Conditional Refresh**:
```typescript
// Only refresh if expired OR user explicitly requests fresh data
async function getPokemonWithRefresh(
  nameOrId: string | number,
  forceFresh = false
): Promise<CachedPokemonExtended | null> {
  const supabase = createClient(...)
  
  const { data: cached } = await supabase
    .from('pokemon_cache')
    .select('*')
    .eq('pokemon_id', pokemonId)
    .single()
  
  const isExpired = cached && new Date(cached.expires_at) < new Date()
  
  if (!cached || isExpired || forceFresh) {
    return await getPokemonDataExtended(pokemonId, true)
  }
  
  return cached
}
```

### Delta Detection

**Track New Releases**:
```typescript
async function detectNewPokemon(): Promise<number[]> {
  const supabase = createClient(...)
  
  // Get highest cached ID
  const { data: maxCached } = await supabase
    .from('pokemon_cache')
    .select('pokemon_id')
    .order('pokemon_id', { ascending: false })
    .limit(1)
    .single()
  
  const maxId = maxCached?.pokemon_id || 0
  
  // Check if PokéAPI has new Pokemon (simple check via max ID endpoint)
  try {
    const pokemon = await pokemonClient.getPokemonById(maxId + 1)
    
    // New Pokemon exists! Determine how many
    const newIds: number[] = []
    let currentId = maxId + 1
    
    while (true) {
      try {
        await pokemonClient.getPokemonById(currentId)
        newIds.push(currentId)
        currentId++
      } catch {
        break // No more new Pokemon
      }
    }
    
    return newIds
  } catch {
    return [] // No new Pokemon
  }
}
```

### Incremental Sync Workflow

```typescript
async function smartIncrementalSync(): Promise<SyncResult> {
  const supabase = createClient(...)
  
  // Step 1: Check for new Pokemon
  const newPokemon = await detectNewPokemon()
  console.log(`[v0] Found ${newPokemon.length} new Pokemon`)
  
  // Step 2: Find expired cache entries
  const { data: expired } = await supabase
    .from('pokemon_cache')
    .select('pokemon_id')
    .lt('expires_at', new Date().toISOString())
  
  console.log(`[v0] Found ${expired?.length || 0} expired entries`)
  
  // Step 3: Combine and deduplicate
  const toSync = [...new Set([...newPokemon, ...(expired?.map(e => e.pokemon_id) || [])])]
  
  console.log(`[v0] Total Pokemon to sync: ${toSync.length}`)
  
  // Step 4: Sync with rate limiting
  let synced = 0
  let failed = 0
  
  for (const id of toSync) {
    const result = await syncWithRetry(id)
    if (result) synced++
    else failed++
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return {
    success: failed === 0,
    recordsProcessed: synced,
    errors: failed > 0 ? [`${failed} Pokemon failed to sync`] : []
  }
}
```

---

## In-App Retrieval Patterns

### Query Patterns

#### 1. **Direct Lookup** (by ID or Name)
```typescript
// Client component
'use client'
import { createBrowserClient } from '@/lib/supabase/client'

export function PokemonDetail({ pokemonId }: { pokemonId: number }) {
  const [pokemon, setPokemon] = useState<CachedPokemonExtended | null>(null)
  const supabase = createBrowserClient()
  
  useEffect(() => {
    async function loadPokemon() {
      const { data } = await supabase
        .from('pokemon_cache')
        .select('*')
        .eq('pokemon_id', pokemonId)
        .single()
      
      setPokemon(data)
    }
    
    loadPokemon()
  }, [pokemonId])
  
  if (!pokemon) return <Skeleton />
  
  return (
    <div>
      <img src={pokemon.sprites.official_artwork || pokemon.sprites.front_default} />
      <h1>{pokemon.name}</h1>
      <p>Types: {pokemon.types.join(', ')}</p>
    </div>
  )
}
```

#### 2. **Server Component Fetch** (Zero Latency)
```typescript
// Server component
import { createServerClient } from '@/lib/supabase/server'

export default async function PokedexPage() {
  const supabase = await createServerClient()
  
  const { data: pokemon } = await supabase
    .from('pokemon_cache')
    .select('pokemon_id, name, types, sprites, tier, draft_cost')
    .order('pokemon_id')
    .range(0, 50) // First 50 for pagination
  
  return (
    <div className="grid grid-cols-5 gap-4">
      {pokemon?.map(p => (
        <PokemonCard key={p.pokemon_id} pokemon={p} />
      ))}
    </div>
  )
}
```

#### 3. **Search & Filter**
```typescript
async function searchPokemon(
  query: string,
  filters: {
    types?: string[]
    tier?: string
    generation?: number
    minDraftCost?: number
    maxDraftCost?: number
  }
): Promise<CachedPokemonExtended[]> {
  const supabase = createClient(...)
  
  let queryBuilder = supabase
    .from('pokemon_cache')
    .select('*')
  
  // Text search
  if (query) {
    queryBuilder = queryBuilder.ilike('name', `%${query}%`)
  }
  
  // Type filter
  if (filters.types && filters.types.length > 0) {
    queryBuilder = queryBuilder.overlaps('types', filters.types)
  }
  
  // Tier filter
  if (filters.tier) {
    queryBuilder = queryBuilder.eq('tier', filters.tier)
  }
  
  // Generation filter
  if (filters.generation) {
    queryBuilder = queryBuilder.eq('generation', filters.generation)
  }
  
  // Draft cost range
  if (filters.minDraftCost) {
    queryBuilder = queryBuilder.gte('draft_cost', filters.minDraftCost)
  }
  if (filters.maxDraftCost) {
    queryBuilder = queryBuilder.lte('draft_cost', filters.maxDraftCost)
  }
  
  const { data, error } = await queryBuilder.limit(50)
  
  if (error) {
    console.error('[v0] Search error:', error)
    return []
  }
  
  return data || []
}
```

#### 4. **Batch Fetch** (for Team Rosters)
```typescript
async function getTeamRoster(teamId: string): Promise<CachedPokemonExtended[]> {
  const supabase = createClient(...)
  
  // Join team_rosters with pokemon_cache
  const { data } = await supabase
    .from('team_rosters')
    .select(`
      draft_round,
      draft_points,
      pokemon_cache (*)
    `)
    .eq('team_id', teamId)
    .order('draft_round')
  
  return data?.map(r => r.pokemon_cache) || []
}
```

#### 5. **Aggregation Queries**
```typescript
// Get type distribution across all cached Pokemon
async function getTypeDistribution(): Promise<Record<string, number>> {
  const supabase = createClient(...)
  
  const { data } = await supabase
    .from('pokemon_cache')
    .select('types')
  
  const distribution: Record<string, number> = {}
  
  data?.forEach(p => {
    p.types.forEach((type: string) => {
      distribution[type] = (distribution[type] || 0) + 1
    })
  })
  
  return distribution
}

// Get tier distribution
async function getTierDistribution(): Promise<Record<string, number>> {
  const supabase = createClient(...)
  
  const { data } = await supabase
    .from('pokemon_cache')
    .select('tier')
  
  const distribution: Record<string, number> = {}
  
  data?.forEach(p => {
    const tier = p.tier || 'Unranked'
    distribution[tier] = (distribution[tier] || 0) + 1
  })
  
  return distribution
}
```

### Caching Strategies (Application-Level)

#### React Query Integration
```typescript
// lib/queries/pokemon.ts
import { useQuery } from '@tanstack/react-query'

export function usePokemon(pokemonId: number) {
  return useQuery({
    queryKey: ['pokemon', pokemonId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('pokemon_cache')
        .select('*')
        .eq('pokemon_id', pokemonId)
        .single()
      
      return data
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (data rarely changes)
    cacheTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
  })
}

export function usePokedex(filters?: SearchFilters) {
  return useQuery({
    queryKey: ['pokedex', filters],
    queryFn: () => searchPokemon('', filters || {}),
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
```

#### Server-Side Caching (Next.js)
```typescript
// app/api/pokemon/[id]/route.ts
export const revalidate = 3600 // 1 hour ISR

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  
  const { data: pokemon } = await supabase
    .from('pokemon_cache')
    .select('*')
    .eq('pokemon_id', parseInt(params.id))
    .single()
  
  return Response.json(pokemon)
}
```

---

## Performance Optimization

### Database Optimizations

#### 1. **Indexes**
```sql
-- Already created in migrations, but verify:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pokemon_cache_name ON pokemon_cache(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pokemon_cache_types ON pokemon_cache USING GIN(types);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pokemon_cache_tier ON pokemon_cache(tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pokemon_cache_generation ON pokemon_cache(generation);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pokemon_cache_expires ON pokemon_cache(expires_at);

-- JSONB indexes for nested queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pokemon_cache_base_stats ON pokemon_cache USING GIN(base_stats);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pokemon_cache_sprites ON pokemon_cache USING GIN(sprites);
```

#### 2. **Query Optimization**
```sql
-- BAD: Select all columns with large JSONB payload
SELECT * FROM pokemon_cache WHERE name = 'pikachu';

-- GOOD: Select only needed columns
SELECT pokemon_id, name, types, sprites->>'official_artwork' as artwork, base_stats, tier
FROM pokemon_cache
WHERE name = 'pikachu';

-- BETTER: Use covering indexes
CREATE INDEX idx_pokemon_cache_pokedex ON pokemon_cache(name) 
INCLUDE (pokemon_id, types, tier, draft_cost);
```

#### 3. **Partitioning** (Optional for Large Datasets)
```sql
-- Partition by generation for faster queries
CREATE TABLE pokemon_cache_partitioned (
  LIKE pokemon_cache INCLUDING ALL
) PARTITION BY LIST (generation);

CREATE TABLE pokemon_cache_gen1 PARTITION OF pokemon_cache_partitioned FOR VALUES IN (1);
CREATE TABLE pokemon_cache_gen2 PARTITION OF pokemon_cache_partitioned FOR VALUES IN (2);
-- ... repeat for all generations
```

### API Optimizations

#### 1. **Batch Fetching**
```typescript
// BAD: N+1 queries
for (const teamRoster of teamRosters) {
  const pokemon = await supabase
    .from('pokemon_cache')
    .select('*')
    .eq('pokemon_id', teamRoster.pokemon_id)
    .single()
}

// GOOD: Single query with IN clause
const pokemonIds = teamRosters.map(r => r.pokemon_id)
const { data: pokemon } = await supabase
  .from('pokemon_cache')
  .select('*')
  .in('pokemon_id', pokemonIds)
```

#### 2. **Cursor Pagination**
```typescript
async function getPaginatedPokedex(
  cursor: number | null,
  limit = 50
): Promise<{ pokemon: CachedPokemonExtended[], nextCursor: number | null }> {
  const supabase = createClient(...)
  
  let query = supabase
    .from('pokemon_cache')
    .select('*')
    .order('pokemon_id')
    .limit(limit + 1) // Fetch one extra to determine if there's a next page
  
  if (cursor) {
    query = query.gt('pokemon_id', cursor)
  }
  
  const { data } = await query
  
  if (!data || data.length === 0) {
    return { pokemon: [], nextCursor: null }
  }
  
  const hasMore = data.length > limit
  const pokemon = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore ? pokemon[pokemon.length - 1].pokemon_id : null
  
  return { pokemon, nextCursor }
}
```

#### 3. **Compression** (for Large JSONB Fields)
```sql
-- Enable pg_zstd for JSONB compression (requires extension)
CREATE EXTENSION IF NOT EXISTS pg_zstd;

ALTER TABLE pokemon_cache ALTER COLUMN payload SET COMPRESSION zstd;
```

### Frontend Optimizations

#### 1. **Image Optimization**
```typescript
// Use Next.js Image component with PokéAPI sprites
import Image from 'next/image'

export function PokemonSprite({ pokemon }: { pokemon: CachedPokemonExtended }) {
  const spriteUrl = pokemon.sprites.official_artwork || pokemon.sprites.front_default
  
  return (
    <Image
      src={spriteUrl || "/placeholder.svg"}
      alt={pokemon.name}
      width={200}
      height={200}
      loading="lazy"
      placeholder="blur"
      blurDataURL="/placeholder-pokemon.png"
    />
  )
}
```

#### 2. **Virtual Scrolling** (for Large Lists)
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function PokedexList({ pokemon }: { pokemon: CachedPokemonExtended[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: pokemon.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated row height
  })
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            <PokemonCard pokemon={pokemon[item.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Deployment & Operations

### Initial Deployment Checklist

#### Phase 1: Database Setup
- [ ] Execute `scripts/001_create_schema.sql` in Supabase SQL Editor
- [ ] Execute `scripts/002_enhanced_schema.sql`
- [ ] Execute `scripts/003_add_extended_pokemon_fields.sql`
- [ ] Verify all tables created: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
- [ ] Verify indexes created: `SELECT indexname FROM pg_indexes WHERE schemaname = 'public';`
- [ ] Test RLS policies: Try inserting/selecting as authenticated vs anonymous user

#### Phase 2: Pre-Cache Competitive Pokémon
- [ ] Set environment variables in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run `node scripts/pre-cache-competitive-pokemon.ts` locally
- [ ] Verify 50 Pokemon cached: `SELECT COUNT(*) FROM pokemon_cache;`
- [ ] Test queries: `SELECT * FROM pokemon_cache WHERE pokemon_id = 25;` (Pikachu)

#### Phase 3: Full Sync Job
- [ ] Deploy full sync script to Vercel/Railway/GitHub Actions
- [ ] Configure cron schedule (3 AM UTC daily)
- [ ] Run initial full sync (overnight, ~2-3 hours)
- [ ] Monitor `sync_jobs` table for progress
- [ ] Verify 1,025+ Pokemon cached after completion

#### Phase 4: Application Integration
- [ ] Update all pages to remove `USE_MOCK_DATA` flags
- [ ] Test Pokédex page: `/pokedex`
- [ ] Test Team Builder: `/teams/builder`
- [ ] Test Match Submission: `/matches/submit`
- [ ] Test AI Features: `/insights`

#### Phase 5: Monitoring & Alerts
- [ ] Set up Sentry for error tracking
- [ ] Configure Vercel Analytics
- [ ] Create Supabase Dashboard widgets:
  - Total cached Pokemon
  - Cache hit rate
  - Expired entries count
  - Failed sync jobs
- [ ] Set up alerts for:
  - Sync job failures
  - Cache expiry threshold (>10% expired)
  - Database storage usage (>80%)

### Monitoring Queries

```sql
-- Dashboard Metrics

-- 1. Total Cached Pokemon
SELECT COUNT(*) as total_cached FROM pokemon_cache;

-- 2. Cache Expiry Status
SELECT 
  COUNT(*) FILTER (WHERE expires_at > NOW()) as valid,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired,
  COUNT(*) FILTER (WHERE expires_at <= NOW() + INTERVAL '7 days') as expiring_soon
FROM pokemon_cache;

-- 3. Recent Sync Jobs
SELECT 
  job_type,
  status,
  pokemon_synced,
  pokemon_failed,
  duration_ms,
  started_at
FROM sync_jobs
ORDER BY started_at DESC
LIMIT 10;

-- 4. Most Queried Pokemon (requires query logging)
SELECT 
  pokemon_id,
  name,
  COUNT(*) as query_count
FROM pokemon_query_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY pokemon_id, name
ORDER BY query_count DESC
LIMIT 20;

-- 5. Storage Usage
SELECT 
  pg_size_pretty(pg_total_relation_size('pokemon_cache')) as cache_size,
  pg_size_pretty(pg_database_size(current_database())) as total_db_size;
```

### Backup & Recovery

#### Automated Backups (Supabase)
Supabase provides daily automated backups. To restore:
1. Go to Supabase Dashboard → Settings → Backups
2. Select backup date
3. Click "Restore"

#### Manual Export
```bash
# Export pokemon_cache table
pg_dump \
  --host=db.YOUR_PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --table=public.pokemon_cache \
  --data-only \
  --file=pokemon_cache_backup_$(date +%Y%m%d).sql

# Restore from backup
psql \
  --host=db.YOUR_PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --file=pokemon_cache_backup_20260112.sql
```

#### Disaster Recovery Plan
1. **Cache Corruption**: Re-run full sync job (2-3 hours)
2. **Database Failure**: Restore from Supabase backup (5-10 minutes)
3. **PokéAPI Outage**: Continue using cached data (30-day buffer)
4. **Sync Job Failure**: Check `error_log` in `sync_jobs`, retry failed IDs

---

## Cost Analysis

### PokéAPI Usage
- **Rate Limit**: 100 requests/minute, unlimited daily
- **Cost**: Free (no API key required)
- **Usage**:
  - Initial sync: 1,025 requests (Pokemon) + 1,025 requests (Species) = ~2,050 total
  - Incremental sync: ~5-20 requests/day (expired entries)
  - On-demand: ~0-10 requests/day (new searches)
- **Total**: ~2,100 requests in Month 1, ~150-300 requests/month ongoing

### Supabase Storage
- **Database Size**:
  - `pokemon_cache`: 1,025 rows × ~15KB/row = ~15MB
  - `moves_cache` (optional): 900 rows × 2KB/row = ~1.8MB
  - `abilities_cache` (optional): 350 rows × 1KB/row = ~350KB
  - **Total**: ~17MB
- **Cost**: $0 (Free tier includes 500MB)

### Vercel Serverless
- **Function Invocations**:
  - Sync jobs: ~30/month (daily cron)
  - User queries: ~10,000/month (estimated)
- **Cost**: $0 (Pro plan includes 1M invocations)

### Total Monthly Cost
- **Month 1**: $0 (initial sync + setup)
- **Ongoing**: $0 (within free tiers)

**Savings vs. Real-Time API Calls**:
- Without cache: 10,000 user queries × 3 API calls each = 30,000 requests/month
- With cache: ~300 API calls/month
- **API call reduction**: 99%

---

## Appendix

### Quick Reference Commands

```bash
# Install dependencies
npm install pokenode-ts @supabase/supabase-js

# Run database migrations
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f scripts/001_create_schema.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f scripts/002_enhanced_schema.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f scripts/003_add_extended_pokemon_fields.sql

# Pre-cache competitive Pokemon
node scripts/pre-cache-competitive-pokemon.ts

# Run full sync
node scripts/full-sync-pokemon.ts

# Test cache
curl http://localhost:3000/api/pokemon/25 # Pikachu

# Check cache status
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM pokemon_cache;"
```

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Cron Secret (for Vercel Cron)
CRON_SECRET=YOUR_RANDOM_SECRET_KEY
```

### Sample SQL Queries

```sql
-- Get all Fire-type Pokemon with OU tier
SELECT pokemon_id, name, types, tier, draft_cost
FROM pokemon_cache
WHERE 'fire' = ANY(types)
AND tier = 'OU'
ORDER BY draft_cost DESC;

-- Find Pokemon with Hidden Ability "Protean"
SELECT pokemon_id, name, hidden_ability
FROM pokemon_cache
WHERE hidden_ability = 'protean';

-- Get Pokemon by generation with type distribution
SELECT 
  generation,
  unnest(types) as type,
  COUNT(*) as count
FROM pokemon_cache
GROUP BY generation, type
ORDER BY generation, count DESC;

-- Find expensive draft picks (>15 points)
SELECT name, draft_cost, tier, types
FROM pokemon_cache
WHERE draft_cost > 15
ORDER BY draft_cost DESC;
```

### Troubleshooting

#### Problem: Cache queries are slow
**Solution**: Verify indexes exist
```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'pokemon_cache';
```

#### Problem: Sync job timing out
**Solution**: Increase serverless function timeout
```javascript
// In Vercel serverless function
export const maxDuration = 300 // 5 minutes
```

#### Problem: PokéAPI rate limit hit
**Solution**: Add delay between requests
```typescript
await new Promise(resolve => setTimeout(resolve, 100)) // 100ms = 600 req/min max
```

#### Problem: Sprites not loading
**Solution**: Check CORS and verify URLs
```typescript
console.log('[v0] Sprite URL:', pokemon.sprites.front_default)
// If null, fall back to official artwork or placeholder
```

---

## Next Steps

1. **Execute Database Migrations** → Run 3 SQL files in Supabase
2. **Run Pre-Cache Script** → Populate 50 competitive Pokemon
3. **Deploy Full Sync Job** → Schedule overnight sync for all 1,025 Pokemon
4. **Update Application Code** → Remove mock data flags, use cached queries
5. **Monitor & Optimize** → Track cache hit rates, sync job success

**Estimated Time to Full Implementation**: 4-6 hours

---

**Document Version**: 1.0  
**Last Updated**: January 12, 2026  
**Author**: v0 AI Assistant  
**Status**: Ready for Implementation ✅
